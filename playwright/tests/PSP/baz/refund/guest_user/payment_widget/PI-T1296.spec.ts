import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as validationRefund from '@support/interfaces/refund';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let transactionId: string;
let responsePurchase: any;

test.describe(
  '@regression BAZ Refund Capture MX',
  { tag: ['@payments_integration', '@fixme_baz_preprod', '@team_payment_integration'] },
  () => {
    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchantConfig = await merchantPool.acquire('BAZ_PROCESSOR_AUTHORIZE_MX');
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
      '@PI-T1296 Refund Capture exitoso con BAZ usando el Payment widget en Mexico',
      { tag: ['@payments_integration', '@fixme_baz_preprod', '@team_payment_integration', '@api'] },
      async ({ userAuthService, paymentService, emaService }) => {
        await test.step('The user send purchase request', async () => {
          const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
          const userToken = responseUserAuth.data.token;
          responsePurchase = await paymentService.purchaseV2(
            privateKey,
            userToken,
            buildPurchaseV2Payload({
              country: 'MX',
              processorName: processorsConfig.bazProcessorAuthorize_MX.name,
              card: creditCardData.bazVisaCardSuccessful,
              token: orderToken,
            })
          );
        });

        await test.step('The transaction is authorized', async () => {
          expect(responsePurchase.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
        });

        await test.step('The transaction is captured', async () => {
          const captureResponse = await paymentService.captureV2(privateKey, orderToken);
          expect(captureResponse.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'captured');
        });

        await test.step('The transaction is refunded', async () => {
          await apiCallNewman.refundOrderV2(validationRefund.successRefund, privateKey, 0, false, {
            orderToken,
          });
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded');
        });
      }
    );
  }
);
