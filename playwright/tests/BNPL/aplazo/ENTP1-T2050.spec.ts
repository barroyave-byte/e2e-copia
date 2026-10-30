import { test } from '@support/fixtures';
import { aplazoProcessor } from '@support/interfaces/payment_processors';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentPage as CheckoutPaymentPage } from '@pages/checkout/payment/paymentPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AplazoFormPage } from '@pages/explore/forms/aplazo/aplazoFormPage';
import { AplazoRedirectPage } from '@pages/bnpl/aplazoPage';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { CommonsActions } from '@pages/commonActions';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');

test.describe(
  '@regression Aplazo Form Purchase - MX',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService }) => {
      const configMerchantCheckout = new ConfigMerchantCheckout();
      const merchant = await configMerchantCheckout.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(aplazoProcessor, merchantId, merchantToken);

      const orderBody = DeunacheckoutOrderBuilder.createBody('CO', { amount: 34200 });
      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test(
      '@ENTP1-T2050 Payment Form - Aplazo: Cancel purchase (Aplazo Window)',
      { tag: ['@smoke_gmv', '@smoke', '@team_enterprise', '@preprod'] },
      async ({ page }) => {
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const paymentPage = new AplazoFormPage(page);
        const commons = new CommonsActions(page);
        const checkoutPaymentPage = new CheckoutPaymentPage(page);
        let aplazoRedirectPage: AplazoRedirectPage;

        await test.step('Should opens the testing page and the required form', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should selects Aplazo as a Payement Method', async () => {
          await paymentPage.selectAplazoForm();
        });

        await test.step('Should click on the Pay button to open the redirect widget', async () => {
          const aplazoRedirectPagePromise = page.waitForEvent('popup');
          await paymentPage.clickPay();
          const popup = await aplazoRedirectPagePromise;
          aplazoRedirectPage = new AplazoRedirectPage(popup);
        });

        await test.step('Should close Aplazo window to cancel purchase', async () => {
          await aplazoRedirectPage.closePage();
          await checkoutPaymentPage.assertAlertNotification(
            checkoutTranslations.apmRedirectView.windowClosedWithoutAction
          );
        });

        await test.step('Should click on the Cancel button to close the redirect widget', async () => {
          // https://github.com/DUNA-E-Commmerce/checkout-base/blob/9a5d296407304470f29904e7a341f85dc2b64977/src/now/events/NowPostMessageEvents.tsx#L50
          // When apmCancelPayment is issued, onEventDispatch and linkClose are executed simultaneously.

          const consoleWaiter = commons.waitForConsoleMessage('onEventDispatch linkClose');
          await checkoutPaymentPage.cancelPurchase();
          await consoleWaiter;
        });

        await test.step('Should validate that the order details are correct', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('pending');
          await adminOrderDetailsPage.assertPaymentMethod('bnpl');
        });
      }
    );
  }
);
