import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { test, expect } from '@support/fixtures';
import * as validationVoid from '@support/interfaces/void';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let responsePurchase: any;

test.describe('@regression Purchase with Cielo', () => {
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('CIELO_AUTHORIZE_BR');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('BR', privateKey, {
      amount: 250000,
    });
    orderToken = tokenizeResponse.data.token;
  });

  test(
    '@PI-T1063 Void a una transacción con estado voided - Cielo',
    { tag: ['@payments_integration', '@team_payment_integration', '@api'] },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'BR',
            processorName: processorsConfig.cieloAuthorize.name,
            card: creditCardData.cieloVisaSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('A void is sent to the authorized transaction', async () => {
        await apiCallNewman.voidOrder(validationVoid.successVoid, privateKey, 0, orderToken);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided');
      });

      await test.step('Validate error when trying to void transaction with status voided', async () => {
        await apiCallNewman.voidOrder(
          validationVoid.errorVoidOrderVoided,
          privateKey,
          0,
          orderToken
        );
      });
    }
  );
});
