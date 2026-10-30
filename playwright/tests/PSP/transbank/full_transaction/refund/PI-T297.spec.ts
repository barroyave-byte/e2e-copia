import { test } from '@support/fixtures';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import * as validationRefund from '@support/interfaces/refund';
import * as validationCapture from '@support/interfaces/capture';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { retryGetOrderStatus } from '@support/utils/retries';

const globalAssert = new GlobalAssert();

test.describe('@regression Purchase with payment processor Transbank CL', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('TRANSBANK_PROCESSOR_AUTHORIZE_CL');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('CL', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test(
    '@PI-T297 Refund a una transaccion con estado captured',
    { tag: ['@payments_integration', '@team_payment_integration', '@preprod', '@refund'] },
    async ({ page, emaService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      await test.step('The user enters the credit card information of the Transbank Visa', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.transbankVisaSuccessfull,
          { country: 'CL' }
        );
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('authorized', 200);
        await globalAssert.assertTransactionPaymentStatus('authorized', privateKey, orderToken);
      });

      await test.step('A capture is sent to the authorized transaction', async () => {
        await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          300000,
          undefined,
          { orderToken }
        );
        await globalAssert.assertTransactionPaymentStatus('captured', privateKey, orderToken);
      });

      await test.step('The captured transaction is refunded', async () => {
        await apiCallNewman.refundOrderV2(validationRefund.successRefund, privateKey, 0, false, {
          orderToken,
        });
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded', 15, 4000);
      });
    }
  );
});
