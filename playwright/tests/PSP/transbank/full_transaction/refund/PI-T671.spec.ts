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
let transactionId: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe(
  '@regression Purchase with payment processor Transbank CL',
  { tag: ['@payments_integration', '@team_payment_integration'] },
  () => {
    test.beforeAll(async ({ emaService }) => {
      const merchantConfig = await configMerchant.basicSetup('CL');
      merchantName = merchantConfig.merchantName;
      merchantId = merchantConfig.merchantId;
      merchantToken = merchantConfig.merchantToken;
      privateKey = merchantConfig.privateKey;
      const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('CL', privateKey);
      orderId = tokenizeResponse.data.order.order_id;
      orderToken = tokenizeResponse.data.token;
      transactionId = tokenizeResponse.data.order.transaction_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.transbankProcessor,
        merchantId,
        merchantToken
      );
    });

    test.fixme(
      '@PI-T671 Partial Refund por monto menor',
      {
        annotation: { type: 'bug', description: 'PF-3774' },
        tag: ['@payments_integration', '@team_payment_integration', '@api'],
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
              processorName: processorsConfig.transbankProcessor.name,
              card: creditCardData.transbankVisaSuccessfull,
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
