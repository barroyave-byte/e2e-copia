import { expect, Response, test } from '@support/fixtures';
import { waitForPurchaseResponse } from '@support/utils/purchase';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PayPalFormPage } from '@pages/explore/forms/paypalFormPage';
import { PayPalPage } from '@pages/wallet/paypalPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import { paypalAccountDeclined, registerUserWithAddress } from '../common';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');
const deunanowTranslations: DeunanowTranslations = getTranslations('deunanow', 'ES');

test.describe(
  '@regression PayPal Wallet - Express Flow (Forms)',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let userToken: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

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
      '@ENTP1-T2350 Declined token flow - New account',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        let paypalPage: PayPalPage;
        const paymentPage = new PaymentPage(page);
        const paypalFormPage = new PayPalFormPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const installments = 1;
        let responsePurchasePromise: Promise<Response>;

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

        // Listen before clicking: the popup can open while clickOnPayButton is still waiting.
        const paypalPopupPromise = page.waitForEvent('popup');

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

        await test.step('Should login on PayPal', async () => {
          await paypalPage.loginVaulting(
            paypalAccountDeclined.email,
            paypalAccountDeclined.password
          );
        });

        await test.step('Should click on PayPal pay button', async () => {
          responsePurchasePromise = waitForPurchaseResponse(page);
          await paypalPage.clickOnConsentButton();
        });

        await test.step('Should show payment redirect view', async () => {
          await paypalPage.assertRedirectPage(
            deunanowTranslations.screenRedirectToCommerceView.labelProcessingPayment
          );
        });

        await test.step('Should receive declined token error code', async () => {
          const expectedErrorCode = 'DP-4025';

          const responsePurchase = await responsePurchasePromise;
          const responseData = await responsePurchase.json();
          const errorCode = responseData.error.code;

          expect(errorCode).toBe(expectedErrorCode);
        });

        await test.step('Should show warning toast', async () => {
          await paymentPage.assertAlertNotification(
            deunanowTranslations.screenAlertNotifications.somethingWentWrong
          );
        });

        await test.step('Should open PayPal popup with button', async () => {
          const paypalPopupPromise = page.waitForEvent('popup');
          await paymentPage.goToPayPalExperience();
          const paypalPopup = await paypalPopupPromise;
          paypalPage = new PayPalPage(paypalPopup);
          await paypalPage.assertPayPalVaultingExperiencePage();
        });

        await test.step('Should validates that the order detail is correct', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('denied');
          await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.paypal);
          await adminOrderDetailsPage.assertPaymentMethod('wallet');
          await adminOrderDetailsPage.assertNumberOfInstallments(installments);
        });
      }
    );
  }
);
