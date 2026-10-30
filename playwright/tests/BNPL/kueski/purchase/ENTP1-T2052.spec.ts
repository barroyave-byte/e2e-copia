import { test } from '@support/fixtures';

import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { getTranslations } from '@support/translations/getTranslations';

import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { PaymentPage as CheckoutPaymentPage } from '@pages/checkout/payment/paymentPage';
import { KueskipayPage } from '@pages/bnpl/kueskipayPage';
import { CommonsActions } from '@pages/commonActions';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');

test.describe(
  '@regression Kueski Pay Form Purchase - MX',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('KUESKI_PROCESSOR_CHECKOUT_MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      const orderBody = DeunacheckoutOrderBuilder.createBody('MX', { amount: 50100 });

      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test(
      '@ENTP1-T2052 Payment Form - Kueski Pay: Cancel purchase (Kueski Window)',
      { tag: ['@installments', '@smoke', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const paymentPage = new PaymentPage(page);
        const checkoutPaymentPage = new CheckoutPaymentPage(page);
        const commons = new CommonsActions(page);

        let kueskipayPage: KueskipayPage;
        const installments: number = 1;

        await test.step('Should opens the testing page and the required form', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should selects Kueski Pay as a Payement Method', async () => {
          await paymentPage.selectPaymentMethod('Kueski Pay');
        });

        await test.step('Should click on the Pay button to open the redirect widget', async () => {
          const kueskiPayPopupPromise = page.waitForEvent('popup');
          await paymentPage.clickOnPayButtonSummary();
          const kueskiPayPopup = await kueskiPayPopupPromise;
          kueskipayPage = new KueskipayPage(kueskiPayPopup);
        });

        await test.step('The order should be processed successfully with status code "200" and status "pending"', async () => {
          await paymentPage.assertOrderStatusRequestPurchase('pending', 200);
        });

        await test.step('Should close the Kuesky Pay window to cancel purchase', async () => {
          await kueskipayPage.closePage();
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
          await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.kueskipay);
          await adminOrderDetailsPage.assertNumberOfInstallments(installments);
          await adminOrderDetailsPage.assertPaymentMethod('bnpl');
        });
      }
    );
  }
);
