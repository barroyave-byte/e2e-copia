import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefund from '@support/interfaces/refund';
import * as validationVoid from '@support/interfaces/void';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let transactionId: string;
let responsePurchase: any;

test.describe(
  '@regression Refund with processor Stripe MX',
  { tag: ['@preprod', '@payments_integration', '@team_payment_integration'] },
  () => {
    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchantConfig = await merchantPool.acquire('STRIPE_PROCESSOR_AUTHORIZE_MX');
      merchantName = merchantConfig.merchantName;
      merchantId = merchantConfig.merchantId;
      merchantToken = merchantConfig.merchantToken;
      privateKey = merchantConfig.privateKey;
      const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
      orderId = tokenizeResponse.data.order.order_id;
      orderToken = tokenizeResponse.data.token;
      transactionId = tokenizeResponse.data.order.transaction_id;
    });

    test(
      '@ENTP1-T1871 Verify stripe error al hacer refund a una orden voided',
      {
        tag: [
          '@preprod',
          '@checkout_ui',
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
              processorName: processorsConfig.stripeProcessorAuthorize.name,
              card: creditCardData.stripeVisaSuccessful,
              token: orderToken,
            })
          );
        });

        await test.step('The transaction is authorized', async () => {
          expect(responsePurchase.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
        });

        await test.step('The transaction is voided', async () => {
          await apiCallNewman.voidOrder(validationVoid.successVoid, privateKey, 0, orderToken);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided');
        });

        await test.step('Validate refund error', async () => {
          await apiCallNewman.refundOrderV2(
            validationRefund.errorRefundOrderVoided,
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
