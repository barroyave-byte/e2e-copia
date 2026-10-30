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
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { paypalAccount, deletePaymentProcessor, registerProcessorForCleanup } from '../common';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';
import { verifyIframeVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');
const deunanowTranslations: DeunanowTranslations = getTranslations('deunanow', 'ES');

test.describe(
  '@regression PayPal Wallet - Payment Widget Flow',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let processorId: string;
    let orderToken: string;
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService }) => {
      const configMerchantCheckout = new ConfigMerchantCheckout();
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

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

      const orderBody = DeunacheckoutOrderBuilder.createBody('MX');
      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test(
      '@ENTP1-T2090 Successful guest purchase without installments',
      { tag: ['@team_enterprise', '@visual'] },
      async ({ page }) => {
        let paypalPage: PayPalPage;
        const paymentPage = new PaymentPage(page);
        const paymentLinkPage = new PaymentLinkPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const installments = 1;

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
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

        await test.step('Should verify the redirect view consistency', async () => {
          await verifyIframeVisualConsistency({
            frameLocator: paymentPage.iframeZoidVisible,
            snapshotName: 'screen-paypal-redirect-view',
            viewports: commonViewportSets.desktopAndFullscreen,
            options: {
              maxDiffPixelRatio: 0,
              maskLocators: [
                paymentPage.spinnerBasePayPalRedirect,
                paymentPage.progressBarBasePayPalRedirect,
              ],
            },
          });
        });

        await test.step('Should login on PayPal', async () => {
          await paypalPage.loginCheckout(paypalAccount.email, paypalAccount.password);
        });

        await test.step('Should click on PayPal pay button', async () => {
          await paypalPage.clickOnPaymentButton();
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
