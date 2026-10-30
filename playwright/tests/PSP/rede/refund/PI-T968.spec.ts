import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
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
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe(
  '@regression Purchase with Rede',
  { tag: ['@payments_integration', '@flaky', '@team_payment_integration'] },
  () => {
    test.beforeAll(async ({ emaService }) => {
      const merchantConfig = await configMerchant.basicSetup('BR');
      merchantName = merchantConfig.merchantName;
      merchantId = merchantConfig.merchantId;
      merchantToken = merchantConfig.merchantToken;
      privateKey = merchantConfig.privateKey;
      const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('BR', privateKey);
      orderId = tokenizeResponse.data.order.order_id;
      orderToken = tokenizeResponse.data.token;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.redeProcessor,
        merchantId,
        merchantToken
      );
    });

    test.fixme(
      '@PI-T968 Partial Refund por monto menor',
      {
        annotation: { type: 'bug', description: 'PF-3806' },
        tag: [
          '@payments_integration',
          '@flaky',
          '@team_payment_integration',
          '@preprod',
          '@partial_refund',
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
              country: 'BR',
              processorName: processorsConfig.redeProcessor.name,
              card: creditCardData.redeVisaSuccessful,
              token: orderToken,
            })
          );
        });

        await test.step('The transaction is processed', async () => {
          expect(responsePurchase.status).toBe(200);
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
        });

        await test.step('The transaction is partially refunded', async () => {
          await apiCallNewman.refundOrderV2(
            validationRefund.successRefundV2,
            privateKey,
            1500,
            false,
            { orderToken }
          );
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'partial_refunded');
        });
      }
    );
  }
);
