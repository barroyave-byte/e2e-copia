import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as voidData from '@support/interfaces/void';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let responsePurchase: any;

test.describe(
  '@regression Void with processor Stripe MX from payment widget',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
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
    });

    test(
      '@ENTP1-T1868 Verify stripe error al hacer void a una orden captured',
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

        await test.step('The transaction is captured', async () => {
          await paymentService.captureV2(privateKey, orderToken);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'captured');
        });

        await test.step('Error when void order is made', async () => {
          await apiCallNewman.voidOrder(voidData.errorVoidOrderCaptured, privateKey, 0, orderToken);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'captured');
        });
      }
    );
  }
);
