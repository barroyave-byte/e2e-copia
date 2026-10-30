import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefundV2 from '@support/interfaces/refundV2';

let externalTransactionId: string;
let transactionId: string;

test.describe('@regression Partial Refund with Kushki in Peru', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_PE');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('PE', privateKey, { amount: 6950 });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PI-T1701 Partial refund exitoso Mastercard con monto IVA resultante en decimales usando el payment widget en Perú',
    {
      tag: [
        '@preprod',
        '@partial_refund',
        '@payments_integration',
        '@smoke',
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
            processorName: processorsConfig.kushkiProcessorPE.name,
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
          validationRefundV2.successRefundV2,
          privateKey,
          2380,
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
    }
  );
});
