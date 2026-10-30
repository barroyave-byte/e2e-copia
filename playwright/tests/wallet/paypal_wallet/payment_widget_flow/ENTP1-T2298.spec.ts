import { test } from '@support/fixtures';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentPage as PaymentLinkPage } from '@pages/payment_link/payment/paymentPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { PayPalPage } from '@pages/wallet/paypalPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import {
  paypalAccount,
  deletePaymentProcessor,
  registerProcessorForCleanup,
  registerUserWithAddress,
} from '../common';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');
const deunanowTranslations: DeunanowTranslations = getTranslations('deunanow', 'ES');

test.describe(
  '@regression PayPal Wallet - Payment Widget Flow',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    const userEmail = `${Math.floor(Math.random() * 9999999)}.qa@deuna.com`;
    let processorId: string;
    let privateKey: string;
    let publicKey: string;
    let userToken: string;
    let merchantId: string;
    let merchantToken: string;
    let orderToken: string;
    let merchantName: string;
    let paypalPage: PayPalPage;
    let paymentLinkPage: PaymentLinkPage;
    let paymentPage: PaymentPage;

    test.beforeAll(async ({ emaService }) => {
      const configMerchantCheckout = new ConfigMerchantCheckout();
      const setup = await configMerchantCheckout.basicSetup('MX');
      merchantId = setup.merchantId;
      merchantToken = setup.merchantToken;
      merchantName = setup.merchantName;
      privateKey = setup.privateKey;
      publicKey = setup.publicKey;

      processorId = await apiCallNewman.createPaymentProcessor(
        processorsConfig.paypalWalletProcessor,
        merchantId,
        merchantToken
      );
      registerProcessorForCleanup(processorId, merchantId, merchantToken);
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.cashProcessor,
        merchantId,
        merchantToken
      );

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
      paymentLinkPage = new PaymentLinkPage(page);
      paymentPage = new PaymentPage(page);

      await test.step('Should opens the testing page and navigate to the required experience', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          userToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('Should click on PayPal tab', async () => {
        await paymentPage.clickOnPayPalTab();
      });

      await test.step('Should click on PayPal button', async () => {
        const paypalPopupPromise = page.waitForEvent('popup');
        await paymentPage.clickOnPayPalButton();
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
      '@ENTP1-T2298 Successful authenticated purchase without installments - Another account',
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
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            userToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should click on PayPal tab', async () => {
          await paymentPage.clickOnPayPalTab();
        });

        await test.step('Should pay with another account', async () => {
          await paymentPage.clickOnPayWithAnotherAccountPayPal();
        });

        await test.step('Should click on PayPal button', async () => {
          await paymentPage.clickOnPayPalButton();
        });

        await test.step('Should show PayPal redirect view', async () => {
          const paypalPopupPromise = page.waitForEvent('popup');
          const paypalPopup = await paypalPopupPromise;
          paypalPage = new PayPalPage(paypalPopup);
          await paymentPage.assertPayPalRedirectSubtitle(
            checkoutTranslations.apmRedirectView.labelDoNotCloseWindow
          );
        });

        await test.step('Should click on PayPal pay button', async () => {
          await paypalPage.clickOnConsentButton();
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
          await adminOrderDetailsPage.assertPaymentMethod('wallet');
          await adminOrderDetailsPage.assertNumberOfInstallments(installments);
        });
      }
    );

    test.afterAll(async () => {
      await deletePaymentProcessor(processorId, merchantId, merchantToken);
    });
  }
);
