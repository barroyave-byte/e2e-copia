import { EmailGenerator } from '@support/utils/EmailGenerator';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefund from '@support/interfaces/refund';

test.describe(
  '@regression Refund with Getnet',
  { tag: ['@payments_integration', '@team_payment_integration'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let orderToken: string;
    let orderId: string;
    let responsePurchase: any;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('GETNET_PROCESSOR_BR');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('BR', privateKey, {
        user_email: EmailGenerator.generatePayerEmail(),
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test(
      '@PAYM-T2117 Refund for full amount tested',
      { tag: ['@payments_integration', '@team_payment_integration', '@api', '@fixme_preprod'] },
      async ({ userAuthService, paymentService, emaService }) => {
        await test.step('The user send purchase request', async () => {
          const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
          const userToken = responseUserAuth.data.token;
          responsePurchase = await paymentService.purchaseV2(
            privateKey,
            userToken,
            buildPurchaseV2Payload({
              country: 'BR',
              processorName: processorsConfig.getnetProcessor.name,
              card: creditCardData.getnetMastercardSuccessful,
              token: orderToken,
            })
          );
        });

        await test.step('It is validated that the order has been processed successfully with status processed', async () => {
          expect(responsePurchase.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
        });

        await test.step('The processed transaction is refunded', async () => {
          await apiCallNewman.refundOrder(
            validationRefund.successRefund,
            privateKey,
            0,
            orderToken
          ); // Getnet uses sync v1 — v2 async webhook not supported yet
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'refunded');
        });
      }
    );
  }
);
