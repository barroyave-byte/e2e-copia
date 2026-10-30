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

test.describe('@regression feature to validate with the automated test case', () => {
  // Redsys rejects 3DS (SIS0754) when the browser timezone offset is 0 (UTC CI runners):
  // payconnect drops the zero-valued time_zone_offset. Pin a Spanish shopper timezone.
  test.use({ timezoneId: 'Europe/Madrid' });

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('REDSYS_PROCESSOR_ES');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('ES', privateKey, {
      amount: 250000,
    });
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
  });

  test(
    '@PF-T20 Redsys denied purchase',
    { tag: ['@payments_integration', '@team_payconnect', '@api'] },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'ES',
            processorName: processorsConfig.redsysProcessor.name,
            card: creditCardData.redsysVisaRejected,
            token: orderToken,
          }),
          true
        );
      });

      await test.step('The transaction is denied', async () => {
        expect(responsePurchase.status).toBe(422);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'denied');
      });
    }
  );
});
