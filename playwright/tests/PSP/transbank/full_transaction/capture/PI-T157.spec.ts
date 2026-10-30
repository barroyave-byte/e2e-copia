import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { test, expect } from '@support/fixtures';
import * as validationCapture from '@support/interfaces/capture';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let responsePurchase: any;

test.describe('@regression Purchase with payment processor Transbank CL', () => {
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('TRANSBANK_PROCESSOR_AUTHORIZE_CL');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('CL', privateKey);
    orderToken = tokenizeResponse.data.token;
  });

  test(
    '@PI-T157 Partial Capture exitoso por monto menor',
    {
      tag: [
        '@payments_integration',
        '@flaky',
        '@team_payment_integration',
        '@api',
        '@preprod',
        '@partial_capture',
      ],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'CL',
            processorName: processorsConfig.transbankProcessorAuthorize.name,
            card: creditCardData.transbankVisaSuccessfull,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('A partial capture is sent to the authorized transaction', async () => {
        await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          1500,
          undefined,
          { orderToken }
        );
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'partial_captured');
      });
    }
  );
});
