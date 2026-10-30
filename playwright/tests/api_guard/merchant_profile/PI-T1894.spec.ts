import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import {
  SIFT_FRAUD_PROCESSOR_FAKE_BODY,
  SIFT_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY,
  DYNAMIC_ROUTING_SIFT_RULE_BODY,
} from '@support/http/testData/dynamicRouting/FraudRoutingConfig';
import { assertSiftApiKeys } from '@support/newman/apiCallNewman';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let orderId: string;
let merchantName: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate merchant profile update', () => {
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
    await apiCallNewman.configureSiftProcessorOnly(
      SIFT_FRAUD_PROCESSOR_FAKE_BODY,
      merchantId,
      merchantToken
    );
    await apiCallNewman.configDynamicRoutingWithFraud(
      SIFT_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY,
      DYNAMIC_ROUTING_SIFT_RULE_BODY,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1894 Actualizar merchant profile Sift',
    {
      tag: [
        '@fraud',
        '@admin_connection',
        '@admin-preprod',
        '@team_payments_capabilities',
        '@api',
        '@preprod',
        '@checkout_configuration',
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
            country: 'MX',
            processorName: processorsConfig.stripeProcessor.name,
            card: creditCardData.stripeVisaSuccessfulFraudAprove,
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });
    }
  );
});
