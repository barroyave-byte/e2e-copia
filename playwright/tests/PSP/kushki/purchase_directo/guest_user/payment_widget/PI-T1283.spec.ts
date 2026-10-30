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
let transactionId: string;
let responsePurchase: any;

test.describe('@regression Purchase with Kushki Chile', () => {
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('KUSHKI_PROCESSOR_CL');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('CL', privateKey);
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
  });

  test(
    '@PI-T1283 Purchase declinado Visa por tarjeta inválida con Kushki usando el payment widget en Chile',
    {
      tag: [
        '@preprod',
        '@purchase',
        '@smoke',
        '@payments_integration',
        '@flaky',
        '@team_payment_integration',
        '@api',
      ],
    },

    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send request purchase to the API with Kushki processor', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'CL',
            processorName: processorsConfig.kushkiProcessorCL.name,
            card: creditCardData.kushkiVisaInvalidCard,
            token: orderToken,
          }),
          true
        );
      });

      await test.step('It is validated that the order has been denied', async () => {
        expect(responsePurchase.status).toBe(422);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'denied');
      });
    }
  );
});
