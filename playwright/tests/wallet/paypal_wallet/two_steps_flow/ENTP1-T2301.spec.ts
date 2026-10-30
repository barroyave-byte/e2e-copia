import { expect, test } from '@support/fixtures';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
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

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');
const deunanowTranslations: DeunanowTranslations = getTranslations('deunanow', 'ES');

test.describe(
  '@regression PayPal Wallet - Two Steps Flow (Forms)',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let userEmail: string;
    let privateKey: string;
    let publicKey: string;
    let userToken: string;
    let merchantId: string;
    let merchantToken: string;
    let orderToken: string;
    let merchantName: string;
    let paypalPage: PayPalPage;
    let paypalFormPage: PayPalFormPage;
    let paymentLinkPage: PaymentLinkPage;
    let paymentPage: PaymentPage;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      userEmail = EmailGenerator.generateRegisteredUserEmail();
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
      paypalFormPage = new PayPalFormPage(page);
      paymentLinkPage = new PaymentLinkPage(page);
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
        await paypalFormPage.selectPayPalExpressForm();
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
      '@ENTP1-T2301 Successful authenticated purchase - Another account',
      { tag: ['@team_enterprise', '@fixme_preprod'] },
      async ({ page, emaService }) => {
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const installments = 1;
        const withSecondaryFrame = true;

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

        await test.step('Should selects PayPal Two Steps as a Payement Method', async () => {
          await paypalFormPage.selectPayPalTwoStepsForm();
        });

        await test.step('Should click on Embed Pay button', async () => {
          await paypalFormPage.clickOnEmbedPayButton();
        });

        await test.step('Should show a PayPal embedded view with the accounts detail', async () => {
          await paymentPage.assertPayPalAccounts();
        });

        await test.step('Should pay with another account', async () => {
          await paymentPage.clickOnPayWithAnotherAccountPayPal();
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
            checkoutTranslations.apmRedirectView.labelDoNotCloseWindow,
            withSecondaryFrame
          );
        });

        await test.step('Should click on PayPal pay button', async () => {
          await paypalPage.clickOnConsentButton();
        });

        await test.step('Should show payment processing view', async () => {
          await paymentPage.assertProcessingModalWithTitle(
            deunanowTranslations.screenRedirectToCommerceView.labelProcessingOrder,
            withSecondaryFrame
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
          await adminOrderDetailsPage.assertPaymentMethod('wallet');
          await adminOrderDetailsPage.assertNumberOfInstallments(installments);
        });
      }
    );
  }
);
