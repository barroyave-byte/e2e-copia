import { expect, test } from '@support/fixtures';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PayPalFormPage } from '@pages/explore/forms/paypalFormPage';
import { PayPalPage } from '@pages/wallet/paypalPage';
import { PaymentPage as PaymentLinkPage } from '@pages/payment_link/payment/paymentPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import { paypalAccount, registerUserWithAddress } from '../common';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const deunanowTranslations: DeunanowTranslations = getTranslations('deunanow', 'ES');

test.describe(
  '@regression PayPal Wallet - Non-Express Flow (Forms)',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    const userEmail = EmailGenerator.generateRegisteredUserEmail();
    let privateKey: string;
    let publicKey: string;
    let userToken: string;
    let merchantId: string;
    let merchantToken: string;
    let orderToken: string;
    let merchantName: string;
    let paymentLinkPage: PaymentLinkPage;
    let paypalFormPage: PayPalFormPage;
    let paymentPage: PaymentPage;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      // The pool entry already carries the PayPal Wallet campaign (MerchantSpec.setup).
      const setup = await merchantPool.acquire('PAYPAL_WALLET_INSTALLMENTS_CHECKOUT_MX');
      merchantId = setup.merchantId;
      merchantToken = setup.merchantToken;
      merchantName = setup.merchantName;
      privateKey = setup.privateKey;
      publicKey = setup.publicKey;

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

    test.beforeEach(async ({ page }) => {
      let paypalPage: PayPalPage;
      paymentLinkPage = new PaymentLinkPage(page);
      paypalFormPage = new PayPalFormPage(page);
      paymentPage = new PaymentPage(page);

      await test.step('Should opens the testing page and navigate to the required experience', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          userToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('Should selects PayPal as a Payement Method', async () => {
        await paypalFormPage.selectPayPalNonExpressForm();
      });

      await test.step('Should click on Pay button', async () => {
        const paypalPopupPromise = page.waitForEvent('popup');
        await paypalFormPage.clickOnPayButton();
        const paypalPopup = await paypalPopupPromise;
        paypalPage = new PayPalPage(paypalPopup);
      });

      await test.step('Should login on PayPal', async () => {
        await paypalPage.loginVaulting(paypalAccount.email, paypalAccount.password);
      });

      await test.step('Should click on PayPal pay button', async () => {
        await paypalPage.clickOnConsentButton();
      });

      await test.step('Should go to the order summary', async () => {
        await paymentLinkPage.assertThankyouPage(
          deunanowTranslations.screenThankYouPage.labelSuccessfulTitle
        );
      });
    });

    test(
      '@ENTP1-T2319 Successful authenticated purchase with installments - Existing account',
      { tag: ['@team_enterprise'] },
      async ({ page, emaService }) => {
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const installments = 1;

        const orderBody = DeunacheckoutOrderBuilder.createBody('MX', {
          amount: 7980000,
          user_email: userEmail,
        });
        const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
        orderToken = tokenized.data.token;

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            userToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should selects PayPal as a Payement Method', async () => {
          await paypalFormPage.selectPayPalNonExpressForm();
        });

        await test.step('Should click on Pay button', async () => {
          await paypalFormPage.clickOnPayButton();
        });

        await test.step('Should show the accounts detail', async () => {
          await paymentPage.assertPayPalAccounts();
        });

        await test.step('Should select installments', async () => {
          await paymentPage.selectInstallmentsPayPal();
        });

        await test.step('Should click on Pay button', async () => {
          const { requestPayload } = (await paymentPage.clickOnPay()) ?? {};
          expect(requestPayload.device_id).toBeTruthy();
          expect(requestPayload.device_id).not.toBe('e30=');
        });

        await test.step('Should show payment processing view', async () => {
          await paymentPage.assertProcessingModalWithTitle(
            deunanowTranslations.screenRedirectToCommerceView.labelProcessingOrder
          );
        });

        await test.step('Should go to the order summary', async () => {
          await paymentLinkPage.assertThankyouPage(
            deunanowTranslations.screenThankYouPage.labelSuccessfulTitle
          );
        });

        await test.step('Should validates that the order detail is correct', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
          await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.paypal);
          // await adminOrderDetailsPage.assertPaymentMethod('wallet');  // TODO: Implementar cuando se realice el fix en payments.
          await adminOrderDetailsPage.assertNumberOfInstallments(installments);
        });
      }
    );
  }
);
