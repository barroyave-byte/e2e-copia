import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let responsePurchase: any;

test.describe('@regression Pays with OpenPay MX', { tag: ['@team_payment_integration'] }, () => {
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('OPEN_PAY_PROCESSOR_AUTHORIZE_MX');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
  });

  test(
    '@PAYM-T152 Partial Capture exitoso por monto menor',
    {
      tag: ['@team_payment_integration', '@api', '@preprod', '@capture'],
    },
    async ({ userAuthService, paymentService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.openPayProcessorAuthorize.name,
            card: creditCardData.openpayMastercardSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('The transaction is authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('Validate "capture" with value minor than authorized: status code "200"', async () => {
        await paymentService.captureV2(privateKey, orderToken, { amount: 600 });
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'partial_captured');
      });
    }
  );
});
