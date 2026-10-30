import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationRefundV2 from '@support/interfaces/refundV2';
import * as validationVoid from '@support/interfaces/void';
import { shouldSkipSameDayVoid } from '@support/utils/timeCutoffSkip';

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
  '@regression Partial refund with Kushki Colombia',
  { tag: ['@smoke', '@payments_integration', '@preprod', '@team_payment_integration'] },
  () => {
    test.skip(() => shouldSkipSameDayVoid('CO').skip, shouldSkipSameDayVoid('CO').reason);
    test.beforeAll(async ({ emaService }) => {
      const merchantConfig = await configMerchant.basicSetup('CO');
      merchantName = merchantConfig.merchantName;
      merchantId = merchantConfig.merchantId;
      merchantToken = merchantConfig.merchantToken;
      privateKey = merchantConfig.privateKey;
      const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('CO', privateKey);
      orderId = tokenizeResponse.data.order.order_id;
      orderToken = tokenizeResponse.data.token;
      transactionId = tokenizeResponse.data.order.transaction_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessorAuthorizeCO,
        merchantId,
        merchantToken
      );
    });

    test(
      '@PI-T1238 Partial refund declinado Mastercard a una orden con status void con Kushki usando el payment widget en Colombia',
      {
        tag: [
          '@smoke',
          '@payments_integration',
          '@preprod',
          '@partial_refund',
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
              country: 'CO',
              processorName: processorsConfig.kushkiProcessorAuthorizeCO.name,
              card: creditCardData.kushkiVisaSuccessfull,
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
          await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided', 15, 5000);
        });

        await test.step('Validate refund error', async () => {
          await apiCallNewman.refundOrderV2(
            validationRefundV2.errorPartialRefundOrderVoided,
            privateKey,
            2000,
            false,
            { orderToken }
          );
        });
      }
    );
  }
);
