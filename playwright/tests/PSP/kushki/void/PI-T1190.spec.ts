import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as validationVoid from '@support/interfaces/void';
import { shouldSkipSameDayVoid } from '@support/utils/timeCutoffSkip';

const configMerchant = new ConfigMerchant();

test.describe('@regression Pay Form DeunaNow Denied Credit Card in Peru', () => {
  test.skip(() => shouldSkipSameDayVoid('PE').skip, shouldSkipSameDayVoid('PE').reason);

  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('PE');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('PE', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessorAuthorizePE,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1190 Void declinado Visa a una orden con status voided con Kushki en Perú',
    {
      tag: [
        '@smoke',
        '@payments_integration',
        '@flaky',
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
            country: 'PE',
            processorName: processorsConfig.kushkiProcessorAuthorizePE.name,
            card: creditCardData.kushkiVisaSuccessfull,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });

      await test.step('The processed transaction is voided', async () => {
        await apiCallNewman.voidOrder(validationVoid.successVoid, privateKey, 0, orderToken);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'voided');
      });

      await test.step('Validate error when voiding a transaction with voided status', async () => {
        await apiCallNewman.voidOrder(
          validationVoid.errorVoidOrderVoided,
          privateKey,
          0,
          orderToken
        );
      });
    }
  );
});
