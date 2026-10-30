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

test.describe('@regression Refund with Kuskhi Ecuador', () => {
  test.skip(() => shouldSkipSameDayVoid('EC').skip, shouldSkipSameDayVoid('EC').reason);
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('EC');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('EC', privateKey);
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessorEC,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1263 Refund declinado Visa a una orden con status void con Kushki usando el payment widget en Ecuador',
    {
      tag: [
        '@smoke',
        '@payments_integration',
        '@preprod',
        '@void',
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
            country: 'EC',
            processorName: processorsConfig.kushkiProcessorEC.name,
            card: creditCardData.kushkiVisaSuccessfull,
            token: orderToken,
          })
        );
      });

      await test.step('The transaction is processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('The transaction is voided', async () => {
        await apiCallNewman.voidOrder(validationVoid.successVoid, privateKey, 0, orderToken);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided', 15, 5000);
      });

      await test.step('Validate refund error', async () => {
        await apiCallNewman.refundOrderV2(
          validationRefundV2.errorRefundOrderVoided,
          privateKey,
          0,
          false,
          { orderToken }
        );
      });
    }
  );
});
