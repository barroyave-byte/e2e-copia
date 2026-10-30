import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefundV2 from '@support/interfaces/refundV2';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let responsePurchase: any;

test.describe('@regression Refund with payment processor Nuvei MX', () => {
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('NUVEI_PROCESSOR_MX');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenizeResponse.data.token;
  });

  test(
    '@PI-T662 Partial Refund por monto menor',
    {
      tag: ['@payments_integration', '@team_payment_integration', '@api'],
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
            processorName: processorsConfig.nuveiProcessor.name,
            card: creditCardData.nuveiVisaSuccessfull,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('The transaction is partial refunded', async () => {
        await apiCallNewman.refundOrderV2(
          validationRefundV2.successRefundV2,
          privateKey,
          1000,
          false,
          { orderToken }
        );
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'partial_refunded');
      });
    }
  );
});
