import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationCapture from '@support/interfaces/capture';

test.describe('@regression Pay Form DeunaNow Denied Credit Card in Peru', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_AUTHORIZE_PE');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('PE', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PI-T1177 Partial capture declinado Visa por monto mayor a orden total con Kushki usando el payment widget en Perú',
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
            country: 'PE',
            processorName: processorsConfig.kushkiProcessorAuthorizePE.name,
            card: creditCardData.kushkiVisaSuccessfull,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('A partial capture is sent to the authorized transaction', async () => {
        await apiCallNewman.captureV2(validationCapture.captureSuccess, privateKey, 15, undefined, {
          orderToken,
        });
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'partial_captured');
      });

      await test.step('Validate error when trying to partial capture transaction with status captured', async () => {
        await apiCallNewman.captureV2(
          validationCapture.errorPartialCaptureToPartialCaptured,
          privateKey,
          1000,
          undefined,
          { orderToken }
        );
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'partial_captured');
      });
    }
  );
});
