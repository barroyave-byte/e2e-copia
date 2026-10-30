import { test, expect } from '@support/fixtures';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let transactionId: string;
let responsePurchase: any;
let taskId: string;

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('KUSHKI_PROCESSOR_AUTHORIZE_MX');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
  });
  test(
    '@PAYM-T2165 Validar procesamiento de peticiones encoladas tipo void por el worker',
    {
      tag: ['@async-worker', '@team_payment_integration'],
    },
    async ({ page, userAuthService, paymentService, emaService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      await test.step('The user send request purchase to the API with Kushki processor', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.kushkiProcessorAuthorize.name,
            card: creditCardData.kushkiVisaSuccessfull,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been authorized successfully', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('Create async refund order', async () => {
        const responseVoidAsync = await paymentService.voidAsync(
          orderToken,
          privateKey,
          3000,
          'reason_test'
        );
        taskId = responseVoidAsync.data.data.task_id;
      });

      await test.step('Validates async void request execution and purchase status update', async () => {
        const orderCreated = {
          merchant_id: merchantId,
          token: orderToken,
          order: { order_id: transactionId },
        };
        await paymentDeunaNowPage.assertExpectedAsyncTaskFields(
          orderCreated,
          { task_id: taskId },
          'void'
        );
      });

      await test.step('Validates that a queued void request is executed', async () => {
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided', 15, 7000);
      });
    }
  );
});
