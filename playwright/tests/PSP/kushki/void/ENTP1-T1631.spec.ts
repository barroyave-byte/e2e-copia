import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationCapture from '@support/interfaces/capture';
import * as validationRefund from '@support/interfaces/refund';
import * as validationVoid from '@support/interfaces/void';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let transactionId: string;
let processorId: string;
let externalTransactionId: string;
let responsePurchase: any;

test.describe(
  '@regression Void with Kushki MX',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchantConfig = await merchantPool.acquire('KUSHKI_PROCESSOR_AUTHORIZE_MX');
      merchantName = merchantConfig.merchantName;
      merchantId = merchantConfig.merchantId;
      merchantToken = merchantConfig.merchantToken;
      privateKey = merchantConfig.privateKey;
      const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
      orderId = tokenizeResponse.data.order.order_id;
      orderToken = tokenizeResponse.data.token;
      transactionId = tokenizeResponse.data.order.transaction_id;
      processorId = merchantConfig.processorIds[0];
    });

    test(
      '@ENTP1-T1631 Check MX error al hacer void to refunded order',
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

        await test.step('The captured transaction is refunded', async () => {
          await apiCallNewman.refundOrderV2(
            validationRefund.successRefund,
            privateKey,
            3000,
            false,
            { orderToken }
          );
          const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
          externalTransactionId = paymentData?.orderPayment?.data?.external_transaction_id;
          transactionId = paymentData?.orderPayment?.data?.id;
          await apiCallNewman.sendWebhookRefundIfPreprod(
            'refunded',
            transactionId,
            externalTransactionId,
            processorId
          );
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
  }
);
