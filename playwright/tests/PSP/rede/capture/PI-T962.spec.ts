import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationCapture from '@support/interfaces/capture';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let responsePurchase: any;

test.describe(
  '@regression Purchase with Rede',
  { tag: ['@payments_integration', '@team_payment_integration', '@preprod'] },
  () => {
    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchantConfig = await merchantPool.acquire('REDE_AUTHORIZE_BR');
      merchantName = merchantConfig.merchantName;
      merchantId = merchantConfig.merchantId;
      merchantToken = merchantConfig.merchantToken;
      privateKey = merchantConfig.privateKey;
      const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('BR', privateKey);
      orderId = tokenizeResponse.data.order.order_id;
      orderToken = tokenizeResponse.data.token;
    });

    test(
      '@PI-T962 Capture rechazado por monto mayor',
      {
        tag: ['@payments_integration', '@team_payment_integration', '@preprod', '@capture', '@api'],
      },
      async ({ userAuthService, paymentService, emaService }) => {
        await test.step('The user send purchase request', async () => {
          const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
          const userToken = responseUserAuth.data.token;
          responsePurchase = await paymentService.purchaseV2(
            privateKey,
            userToken,
            buildPurchaseV2Payload({
              country: 'BR',
              processorName: processorsConfig.redeAuthorize.name,
              card: creditCardData.redeVisaSuccessful,
              token: orderToken,
            })
          );
        });

        await test.step('The transaction is authorized', async () => {
          expect(responsePurchase.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
        });

        await test.step('Validate error when trying to capture transaction with amount greater', async () => {
          const captureResponse = await paymentService.captureV2(privateKey, orderToken, {
            amount: 3000000,
            expectError: true,
          });
          apiCallNewman.assertCaptureV2Error(
            captureResponse,
            validationCapture.errorCaptureAmountGreaterV2
          );
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
        });
      }
    );
  }
);
