import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { assertSiftApiKeys } from '@support/newman/apiCallNewman';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let orderId: string;
let merchantName: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: 'dlora@deuna.com',
      amount: 4990,
    });
    orderToken = tokenizeResponse.data.token;
    orderId = tokenizeResponse.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.configDynamicRoutingWithSift(merchantId, merchantToken);
  });

  test(
    '@PI-T1911 Verificación de credenciales en la solicitud al proveedor sift',
    {
      tag: ['@fraud', '@admin_connection', '@admin-preprod', '@team_payments_capabilities', '@api', '@i-hub-stripe' ],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.stripeProcessor.name,
            card: creditCardData.stripeVisaSuccessfulFraudAprove,
            token: orderToken,
          })
        );
      });

      await test.step('The transaction is processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('It validates correct api keys for sift', async () => {
        const siftApiKey = processorsConfig.siftFraudProcessor.properties[0].property_name;
        await assertSiftApiKeys(orderId, siftApiKey);
      });
    }
  );
});
