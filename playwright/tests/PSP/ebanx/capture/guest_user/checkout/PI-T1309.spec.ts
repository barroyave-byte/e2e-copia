import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
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
const configMerchant = new ConfigMerchant();

test.describe('@regression EBANX Capture BR', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('BR');
    merchantName = merchantConfig.merchantName;
    orderId = new Date().getTime().toString();
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('BR', privateKey, {
      order_id: `${orderId}`,
      billing_address1: '1230',
      billing_address2: '1230',
      billing_identity_document: '11960610767',
    });
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.createEbanxProcessor('BR', true, 'BRL'),
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1309 Capture exitoso con EBANX en Brazil',
    {
      tag: [
        '@payments_integration',
        '@fix_ebanx_preprod',
        '@team_payment_integration',
        '@preprod',
        '@api',
      ],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'BR',
            processorName: processorsConfig.createEbanxProcessor('BR', true, 'BRL').name,
            card: creditCardData.ebanxVisaSuccessful,
            token: orderToken,
          })
        );
      });

      await test.step('The transaction is authorized', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'authorized');
      });
    }
  );
});
