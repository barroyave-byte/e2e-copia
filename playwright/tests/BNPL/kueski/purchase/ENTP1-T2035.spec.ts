import { test } from '@support/fixtures';

import * as processorsConfig from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { errorPurchaseKueskiPay } from '@support/interfaces/capture/errorsCapture';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { PaymentPage as CheckoutPaymentPage } from '@pages/checkout/payment/paymentPage';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

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

      const orderBody = DeunacheckoutOrderBuilder.createBody('MX', { amount: 5900 });

      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test(
      '@ENTP1-T2035 Payment Form - Kueski Pay: Error purchase',
      { tag: ['@installments', '@smoke', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const paymentPage = new PaymentPage(page);
        const checkoutPaymentPage = new CheckoutPaymentPage(page);
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
          await paymentPage.clickOnPayButtonSummary();
        });

        await test.step('The order should not be processed successfully with status code "422" and status "denied"', async () => {
          await paymentPage.assertOrderStatusRequestPurchase('denied', 422);
        });

        await test.step('Should show the error code', async () => {
          const errorCode = errorPurchaseKueskiPay.errorCode;
          await paymentPage.assertResponseErrorCode(errorCode);
          await checkoutPaymentPage.assertErrorCode(errorCode);
        });

        await test.step('The back button should close the popup', async () => {
          await checkoutPaymentPage.closePopupWithReturnButton();
        });

        await test.step('Should validate that the order details are correct', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('denied');
          await adminOrderDetailsPage.assertProcessorName(processorsConfig.kueskiProcessor.name);
          await adminOrderDetailsPage.assertNumberOfInstallments(installments);
          await adminOrderDetailsPage.assertPaymentMethod('bnpl');
        });
      }
    );
  }
);
