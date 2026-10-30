import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationCapture from '@support/interfaces/capture';

let merchantConfig;
let order;

test.describe('@regression Partial capture with Kushki Chile', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    merchantConfig = await merchantPool.acquire('KUSHKI_PROCESSOR_AUTHORIZE_CL');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    order = await emaService.tokenizeDeunaNowOrder('CL', merchantConfig.privateKey);
    orderToken = order.data.token;
    orderId = order.data.order.order_id;
  });

  test(
    '@PI-T1272 Partial capture exitoso con Kushki usando el payment widget en Chile',
    {
      tag: [
        '@preprod',
        '@partial_capture',
        '@smoke',
        '@payments_integration',
        '@team_payment_integration',
        '@api',
      ],
    },
    async ({ userAuthService, paymentService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'CL',
            processorName: processorsConfig.kushkiProcessorAuthorizeCL.name,
            card: creditCardData.kushkiVisaSuccessfull,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('A partial capture is sent to the authorized transaction', async () => {
        await apiCallNewman.captureV2(validationCapture.captureSuccess, privateKey, 10, undefined, {
          orderToken,
        });
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'partial_captured');
      });
    }
  );
});
