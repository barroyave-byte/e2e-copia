import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefund from '@support/interfaces/refund';
import * as validationRefundV2 from '@support/interfaces/refundV2';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let transactionId: string;
let responsePurchase: any;

test.describe('@regression Pays with Dlocal CL', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('DLOCAL_PROCESSOR_CL');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('CL', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PAYM-T200 Refund a una transaccion con estado processed',
    {
      tag: [
        '@review_action',
        '@payments_integration',
        '@team_payment_integration',
        '@preprod',
        '@refund',
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
            processorName: processorsConfig.dlocalProcessor.name,
            card: creditCardData.dlocalMasterCardSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "processed"', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('The processed transaction is refunded', async () => {
        await apiCallNewman.refundOrderV2(validationRefund.successRefund, privateKey, 0, false, {
          orderToken,
        });
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded');
      });

      await test.step('Validate error when trying to refund an already refunded transaction', async () => {
        await apiCallNewman.refundOrderV2(
          validationRefundV2.errorRefundOrderRefunded,
          privateKey,
          0,
          false,
          { orderToken }
        );
      });
    }
  );
});
