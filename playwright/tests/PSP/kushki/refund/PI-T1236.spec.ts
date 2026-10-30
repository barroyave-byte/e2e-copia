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
let externalTransactionId: string;

test.describe(
  '@regression Partial refund with Kushki Colombia',
  { tag: ['@preprod', '@smoke', '@payments_integration', '@team_payment_integration'] },
  () => {
    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchantConfig = await merchantPool.acquire('KUSHKI_PROCESSOR_CO');
      merchantName = merchantConfig.merchantName;
      merchantId = merchantConfig.merchantId;
      merchantToken = merchantConfig.merchantToken;
      privateKey = merchantConfig.privateKey;
      const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('CO', privateKey);
      orderId = tokenizeResponse.data.order.order_id;
      orderToken = tokenizeResponse.data.token;
      transactionId = tokenizeResponse.data.order.transaction_id;
    });

    test(
      '@PI-T1236 Partial refund exitoso Visa para luego hacer refund a resto de orden con Kushki usando el payment widget en Colombia',
      {
        tag: [
          '@preprod',
          '@partial_refund',
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
              country: 'CO',
              processorName: processorsConfig.kushkiProcessorCO.name,
              card: creditCardData.kushkiVisaSuccessfull,
              token: orderToken,
            })
          );
        });

        await test.step('The transaction is processed', async () => {
          expect(responsePurchase.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
        });

        await test.step('The transaction is partially refunded', async () => {
          await apiCallNewman.refundOrderV2(
            validationRefund.successRefundV2,
            privateKey,
            100000,
            false,
            { orderToken }
          );
          const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
          externalTransactionId = paymentData?.orderPayment?.data?.external_transaction_id;
          transactionId = paymentData?.orderPayment?.data?.id;

          await apiCallNewman.sendWebhookRefundIfPreprod(
            'partial_refunded',
            transactionId,
            externalTransactionId
          );
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'partial_refunded');
        });

        await test.step('The transaction is fully refunded', async () => {
          await apiCallNewman.refundOrderV2(
            validationRefund.successRefundV2,
            privateKey,
            200000,
            false,
            { orderToken }
          );
          const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
          externalTransactionId = paymentData?.orderPayment?.data?.external_transaction_id;
          transactionId = paymentData?.orderPayment?.data?.id;

          await apiCallNewman.sendWebhookRefundIfPreprod(
            'refunded',
            transactionId,
            externalTransactionId
          );
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded');
        });
      }
    );
  }
);
