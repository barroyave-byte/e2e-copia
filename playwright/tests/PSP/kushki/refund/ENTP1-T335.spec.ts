import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { successRefundV2 } from '@support/interfaces/refundV2';
import * as validationRefund from '@support/interfaces/refund';

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

test.describe('@regression Refund with payment processor Kushki MX', () => {
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
    '@ENTP1-T335 Check MX Usuario Invitado Refund Parcial con un valor dentro del amount total y el segundo con el sobrante de la compra',
    {
      tag: [
        '@preprod',
        '@checkout_ui',
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
            country: 'MX',
            processorName: processorsConfig.kushkiProcessor.name,
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
        await apiCallNewman.refundOrderV2(successRefundV2, privateKey, 1000, false, { orderToken });
        const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        externalTransactionId = paymentData?.orderPayment?.data?.external_transaction_id;
        transactionId = paymentData?.orderPayment?.data?.id;

        await apiCallNewman.sendWebhookRefundIfPreprod(
          'partial_refunded',
          transactionId,
          externalTransactionId,
          processorId
        );
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'partial_refunded');
      });

      await test.step('The partial refunded transaction is refunded', async () => {
        await apiCallNewman.refundOrderV2(validationRefund.successRefund, privateKey, 2000, false, {
          orderToken,
        }); //TODO review Erika
        const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        externalTransactionId = paymentData?.orderPayment?.data?.external_transaction_id;
        transactionId = paymentData?.orderPayment?.data?.id;

        await apiCallNewman.sendWebhookRefundIfPreprod(
          'refunded',
          transactionId,
          externalTransactionId,
          processorId
        );
        const status = 'refunded';
        await retryGetOrderStatus(emaService, privateKey, orderToken, status, 15, 5000);
      });
    }
  );
});
