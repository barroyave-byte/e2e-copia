import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationVoid from '@support/interfaces/void';

test.describe(
  '@regression Void with payment processor Kushki MX',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let orderToken: string;
    let orderId: string;
    let responsePurchase: any;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test(
      '@ENTP1-T344 Check MX Usuario Invitado Void a una transaccion con estado processed',
      {
        tag: [
          '@smoke',
          '@payments_integration',
          '@preprod',
          '@checkout_ui',
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

        await test.step('It is validated that the order has been processed successfully with status processed', async () => {
          expect(responsePurchase.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed', 15, 5000);
        });

        await test.step('A void is sent to the processed transaction', async () => {
          await apiCallNewman.voidOrder(validationVoid.successVoid, privateKey, 0, orderToken);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided', 15, 5000);
        });
      }
    );
  }
);
