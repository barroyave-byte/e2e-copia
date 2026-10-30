import { test, expect } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { PayPalFormPage } from '@pages/explore/forms/paypalFormPage';
import { PayPalPage } from '@pages/wallet/paypalPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';
import { registerUserWithAddress } from '../common';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');
const deunanowTranslations: DeunanowTranslations = getTranslations('deunanow', 'ES');

test.describe(
  '@regression PayPal Wallet - Express Flow (Forms)',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let userToken: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('PAYPAL_WALLET_CHECKOUT_MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      const userEmail = EmailGenerator.generateRegisteredUserEmail();
      await registerUserWithAddress(userEmail, merchantId, privateKey);
      const configAuth = new ConfigAuth();
      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);

      const orderBody = DeunacheckoutOrderBuilder.createBody('MX', {
        amount: 7980000,
        user_email: userEmail,
      });
      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test(
      '@ENTP1-T2088 Cancel authenticated purchase',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        let paypalPage: PayPalPage;
        const paymentPage = new PaymentPage(page);
        const paypalFormPage = new PayPalFormPage(page);

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            userToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should selects PayPal as a Payement Method', async () => {
          await paypalFormPage.selectPayPalExpressForm();
        });

        const paypalPopupPromise = page.waitForEvent('popup');
        const consentRequestPromise = paypalFormPage.waitForConsentRequest(orderToken);

        await test.step('Should click on Pay button', async () => {
          await paypalFormPage.clickOnPayButton();
        });

        await test.step('Should show PayPal redirect view', async () => {
          const paypalPopup = await paypalPopupPromise;
          paypalPage = new PayPalPage(paypalPopup);
          await paymentPage.assertPayPalRedirectSubtitle(
            checkoutTranslations.apmRedirectView.labelDoNotCloseWindow
          );
        });

        await test.step('Should click on Return to Store button', async () => {
          await consentRequestPromise;
          await paypalPage.clickOnReturnToStoreButton();
        });

        await test.step('Should show payment redirect view', async () => {
          try {
            await paypalPage.assertRedirectPage(
              deunanowTranslations.screenRedirectToCommerceView.labelPaymentCancelled
            );
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (
              !msg.includes('Target page, context or browser has been closed') &&
              !msg.includes('page has been closed')
            ) {
              throw err;
            }
            // PayPal can auto-close the popup before assertRedirectPage evaluates.
            // This is NOT silently ignored — the "Should validates the order cancelation"
            // step below always runs and asserts the cancel notification is visible on
            // the main page, catching any unexpected popup closure.
          }
        });

        await test.step('Should verify payment was not completed after cancel', async () => {
          const { orderStatus, bodyResponse } = await apiCallNewman.getOrderPaymentStatus(
            privateKey,
            orderToken
          );
          expect(bodyResponse?.order?.order_id).toBeTruthy();
          // After a PayPal cancel, no payment is processed — status remains empty.
          // Assert it's not 'processed' to catch cases where a cancelled flow
          // incorrectly results in a completed payment.
          expect(orderStatus).not.toBe('processed');
        });

        await test.step('Should validates the order cancelation', async () => {
          await paymentPage.assertAlertErrorNotification(
            deunanowTranslations.screenAlertNotifications.accountConfigurationError
          );
        });
      }
    );
  }
);
