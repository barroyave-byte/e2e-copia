import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefund from '@support/interfaces/refundV2';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let transactionId: string;
let responsePurchase: any;
let processorId = '';
let externalTransactionId = '';

test.describe(
  '@regression Refund with Kushki Chile',
  { tag: ['@preprod', '@smoke', '@payments_integration', '@team_payment_integration'] },
  () => {
    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchantConfig = await merchantPool.acquire('KUSHKI_PROCESSOR_AUTHORIZE_CL');
      merchantName = merchantConfig.merchantName;
      merchantId = merchantConfig.merchantId;
      merchantToken = merchantConfig.merchantToken;
      privateKey = merchantConfig.privateKey;
      const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('CL', privateKey);
      orderId = tokenizeResponse.data.order.order_id;
      orderToken = tokenizeResponse.data.token;
      transactionId = tokenizeResponse.data.order.transaction_id;
      processorId = merchantConfig.processorIds[0];
    });

    test(
      '@PI-T1275 Refund exitoso Visa a una orden con status de capture con Kushki usando el payment widget en Chile',
      {
        tag: [
          '@preprod',
          '@refund',
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

        await test.step('The transaction is authorized', async () => {
          expect(responsePurchase.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
        });

        await test.step('The transaction is captured', async () => {
          await paymentService.captureV2(privateKey, orderToken);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'captured', 15, 5000);
        });

        await test.step('The transaction is refunded', async () => {
          await apiCallNewman.refundOrderV2(
            validationRefund.successRefundV2,
            privateKey,
            0,
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

          await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded', 15, 5000);
        });
      }
    );
  }
);
