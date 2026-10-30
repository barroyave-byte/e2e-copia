import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationCapture from '@support/interfaces/capture';
import * as validationVoid from '@support/interfaces/void';

test.describe(
  '@regression Void with Kushki MX',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let orderToken: string;
    let orderId: string;
    let responsePurchase: any;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_AUTHORIZE_MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test(
      '@ENTP1-T1512 Check MX error al hacer void a una transacción capturada',
      {
        tag: [
          '@smoke',
          '@payments_integration',
          '@preprod',
          '@checkout_ui',
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
              country: 'MX',
              processorName: processorsConfig.kushkiProcessorAuthorize.name,
              card: creditCardData.kushkiVisaSuccessfull,
              token: orderToken,
            })
          );
        });

        await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
          expect(responsePurchase.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized', 15, 5000);
        });

        await test.step('A total capture is sent to the authorized transaction', async () => {
          await apiCallNewman.captureV2(
            validationCapture.captureSuccess,
            privateKey,
            3000,
            undefined,
            { orderToken }
          );
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'captured');
        });

        await test.step('Validate error when trying to void transaction with lower amount that status captured', async () => {
          await apiCallNewman.voidOrder(
            validationVoid.errorVoidOrderCaptured,
            privateKey,
            3000,
            orderToken
          );
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'captured');
        });
      }
    );
  }
);
