import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { test, expect } from '@support/fixtures';
import * as validationCapture from '@support/interfaces/capture';
import * as validationRefund from '@support/interfaces/refund';
import * as validationVoid from '@support/interfaces/void';
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
    '@PI-T307 Void a una transacción con estado refunded - Transbank - Payment widget',
    {
      tag: ['@payments_integration', '@team_payment_integration', '@api', '@preprod', '@void'],
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

      await test.step('A capture is sent to the authorized transaction', async () => {
        await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          300000,
          undefined,
          { orderToken }
        );
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'captured');
      });

      await test.step('The captured transaction is refunded', async () => {
        await apiCallNewman.refundOrderV2(validationRefund.successRefund, privateKey, 0, false, {
          orderToken,
        });
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded');
      });

      await test.step('Validate error when trying to void transaction with status refunded', async () => {
        await apiCallNewman.voidOrder(
          validationVoid.errorVoidOrderRefunded,
          privateKey,
          0,
          orderToken
        );
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded');
      });
    }
  );
});
