import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { getValueByPathWithRetry, retryGetOrderStatus } from '@support/utils/retries';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';

const configMerchant = new ConfigMerchant();
// TODO: migrate getOrderId to emaService
test.describe('@regression Purchase Open pay with CVV2', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;
  let responsePurchase: any;

  test.beforeAll(async ({ emaService, paymentService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await paymentService.configMerchantPspTokenization(merchantId, merchantToken);
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.openPayFingerprintProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PAYM-T2183 Purchase con tarjeta tokenizada (exitoso) + cvv2',
    { tag: ['@team_payment_integration'] },
    async ({ page, paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.openPayFingerprintProcessor.name,
            card: creditCardData.openpayVisaSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        const status = 'processed';
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, status);
      });

      await test.step('It is validated that the transaction has been processed successfully with status processed', async () => {
        const transactionId = orderId;
        const jsonPathQuery = '$..cvv2';
        const cvv2 = await getValueByPathWithRetry(
          page,
          transactionId,
          jsonPathQuery,
          merchantId,
          merchantToken
        );
        expect(cvv2).toBeTruthy();
        expect(cvv2[0]).toBe('***');
      });
    }
  );
});
