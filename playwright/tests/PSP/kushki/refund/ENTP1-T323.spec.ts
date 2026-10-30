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
let processorId: string;
let externalTransactionId: string;

test.describe(
  '@regression Refund with payment processor Kushki MX',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let processorId = '';
    let externalTransactionId = '';
    let transactionId = '';
    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchantConfig = await merchantPool.acquire('KUSHKI_PROCESSOR_MX');
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
      '@ENTP1-T323 Check MX Usuario Invitado Refund a una transaccion procesada',
      {
        tag: [
          '@preprod',
          '@checkout_ui',
          '@smoke',
          '@payments_integration',
          '@admin',
          '@admin-preprod',
          '@team_payment_integration',
          '@api',
        ],
      },
      async ({ userAuthService, paymentService, emaService }) => {
        await test.step('The user send request purchase to the API with Kushki processor', async () => {
          const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
          const userToken = responseUserAuth.data.token;
          responsePurchase = await paymentService.purchaseV2(
            privateKey,
            userToken,
            buildPurchaseV2Payload({
              country: 'MX',
              processorName: processorsConfig.kushkiProcessor.name,
              card: creditCardData.kushkiVisaSuccessfull,
              token: orderToken,
            })
          );
        });

        await test.step('It is validated that the order has been processed successfully with status processed', async () => {
          expect(responsePurchase.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
        });

        await test.step('The processed transaction is refunded', async () => {
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
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded');
        });

        await test.step('Validate error when trying to refund transaction already refunded', async () => {
          await apiCallNewman.refundOrderV2(
            validationRefund.errorRefundOrderRefunded,
            privateKey,
            0,
            false,
            { orderToken }
          );
        });
      }
    );
  }
);
