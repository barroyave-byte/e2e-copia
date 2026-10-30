import { test } from '@support/fixtures';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PayPalPage } from '@pages/wallet/paypalPage';
import { PaymentPage as PaymentLinkPage } from '@pages/payment_link/payment/paymentPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
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
import { APM_CURRENCY_FILTER_ENABLED } from '@support/http/testData/payment';

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');
const deunanowTranslations: DeunanowTranslations = getTranslations('deunanow', 'ES');

test.describe(
  '@regression PayPal Wallet - Payment Widget Flow',
  { tag: ['@payment_widget', '@team_enterprise'] },
  () => {
    let processorIDMXN: string;
    let processorIDUSD: string;
    let orderToken: string;
    let merchantId: string;
    let userToken: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService, paymentService }) => {
      const userEmail = `${Math.floor(Math.random() * 9999999)}.qa@deuna.com`;

      const configMerchantCheckout = new ConfigMerchantCheckout();
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.cashProcessor,
        merchantId,
        merchantToken
      );
      processorIDMXN = await apiCallNewman.createPaymentProcessor(
        processorsConfig.paypalWalletProcessor,
        merchantId,
        merchantToken
      );
      registerProcessorForCleanup(processorIDMXN, merchantId, merchantToken);
      processorIDUSD = await apiCallNewman.createPaymentProcessor(
        processorsConfig.paypalWalletProcessorUSD,
        merchantId,
        merchantToken
      );
      registerProcessorForCleanup(processorIDUSD, merchantId, merchantToken);

      await paymentService.createConfigMerchantPayments(
        APM_CURRENCY_FILTER_ENABLED,
        merchantId,
        merchantToken
      );

      await registerUserWithAddress(userEmail, merchantId, privateKey);

      const configAuth = new ConfigAuth();
      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);

      const orderBody = DeunacheckoutOrderBuilder.createBody('MX', {
        amount: 7980000,
        currency: 'USD',
        user_email: userEmail,
      });
      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test('@PI-T2005 Purchase with PayPal Wallet in USD enabling two processors (USD - MXN)', async ({
      page,
    }) => {
      let paypalPage: PayPalPage;
      const paymentPage = new PaymentPage(page);
      const paymentLinkPage = new PaymentLinkPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

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

      // Listen before clicking: the popup can open before the next step starts.
      const paypalPopupPromise = page.waitForEvent('popup');

      await test.step('Should click on PayPal button', async () => {
        await paymentPage.clickOnPayPalButton();
      });

      await test.step('Should show PayPal redirect view', async () => {
        const paypalPopup = await paypalPopupPromise;
        paypalPage = new PayPalPage(paypalPopup);
        await paymentPage.assertPayPalRedirectSubtitle(
          checkoutTranslations.apmRedirectView.labelDoNotCloseWindow
        );
      });

      await test.step('Should login on PayPal', async () => {
        await paypalPage.loginVaulting(paypalAccount.email, paypalAccount.password);
      });

      await test.step('Should click on PayPal pay button', async () => {
        await paypalPage.clickOnConsentButton();
      });

      await test.step('Should show payment redirect view', async () => {
        await paypalPage.assertRedirectPage(
          deunanowTranslations.screenRedirectToCommerceView.labelProcessingPayment
        );
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
      });
    });

    test.afterAll(async () => {
      await deletePaymentProcessor(processorIDMXN, merchantId, merchantToken);
      await deletePaymentProcessor(processorIDUSD, merchantId, merchantToken);
    });
  }
);
