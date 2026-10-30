import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import { buildCashPaymentPayload } from '@support/http/testData/payment/CashPaymentPayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let transactionId: string;
let responsePurchase: any;

test.describe('@regression Purchase with Cash EC', () => {
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('CASH_PROCESSOR_EC');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('EC', privateKey);
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
  });

  test(
    '@PI-T1720 Realizar pago usando Cash y validar el JSON de payments',
    {
      tag: [
        '@critical_e2e',
        '@payments_integration',
        '@flaky',
        '@team_payment_integration',
        '@preprod',
        '@purchase',
        '@api',
      ],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send cash purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildCashPaymentPayload({
            country: 'EC',
            processorName: processorsConfig.cashProcessorEC.name,
            token: orderToken,
          })
        );
      });

      await test.step('Validate the payment request returns status "pending"', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'pending');
      });

      await test.step('Validate the payments JSON object', async () => {
        const resultGetOrder = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        const paymentObject = resultGetOrder.orderPayment.data;

        expect(paymentObject).not.toBeUndefined();
        expect(paymentObject).not.toBeNull();
        expect(paymentObject.amount.currency).toEqual('USD');
        expect(paymentObject.method_type).toEqual('cash');
        expect(paymentObject.status).toEqual('pending');
        expect(paymentObject.from_card.card_brand).toEqual('');
        expect(paymentObject.processor).toEqual('cash');
      });
    }
  );
});
