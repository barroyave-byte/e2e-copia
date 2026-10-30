import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefundV2 from '@support/interfaces/refundV2';
import * as validationCapture from '@support/interfaces/capture';

test.describe('@regression Refunding transactions with Kushki', () => {
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
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, { amount: 500000 });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PI-T1845 Kushki - Status Partial Refunding when partial refunding transactions with Captured status',
    {
      tag: [
        '@test_base',
        '@payments_integration',
        '@team_payment_integration',
        '@api',
        '@preprod',
        '@partial_refund',
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

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "authorized"', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized', 15, 5000);
      });

      await test.step('Total Capture order', async () => {
        await apiCallNewman.captureV2(validationCapture.captureSuccess, privateKey, 0, undefined, {
          orderToken,
        });
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'captured');
      });

      await test.step('Validate partial refunding to transaction captured', async () => {
        await apiCallNewman.refundOrderV2(
          validationRefundV2.successRefundV2,
          privateKey,
          800,
          false,
          { orderToken }
        );
        await apiCallNewman.expectRefundInProgress(
          emaService,
          privateKey,
          orderToken,
          'partial_refunding',
          {
            orderId,
            merchantId,
            merchantToken,
          }
        );
        const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        await apiCallNewman.sendWebhookRefundIfPreprod(
          'partial_refunded',
          paymentData?.orderPayment?.data?.id,
          paymentData?.orderPayment?.data?.external_transaction_id
        );
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'partial_refunded');
      });
    }
  );
});
