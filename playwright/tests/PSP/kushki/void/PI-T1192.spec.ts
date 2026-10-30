import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationCapture from '@support/interfaces/capture';
import * as validationVoid from '@support/interfaces/void';

test.describe('@regression Pay Form DeunaNow Denied Credit Card in Peru', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('KUSHKI_PROCESSOR_AUTHORIZE_PE');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('PE', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PI-T1192 Void declinado Mastercard a una orden con status partial captured con Kushki en Perú',
    {
      tag: [
        '@smoke',
        '@payments_integration',
        '@preprod',
        '@partial_capture',
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

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('The processed transaction is partially captured', async () => {
        await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          1000,
          undefined,
          { orderToken }
        );
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'partial_captured');
      });

      await test.step('Validate error when voiding a transaction with voided status', async () => {
        await apiCallNewman.voidOrder(
          validationVoid.errorVoidOrderPartialCaptured,
          privateKey,
          0,
          orderToken
        );
      });
    }
  );
});
