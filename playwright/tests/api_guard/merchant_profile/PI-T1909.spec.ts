import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus, retryGetFraudDecision } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import {
  CLEARSALE_BRASIL_FRAUD_PROCESSOR_BODY,
  DYNAMIC_ROUTING_CLEARSALE_BRASIL_ALL_RISKS_RULE_BODY,
} from '@support/http/testData/dynamicRouting/FraudRoutingConfig';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('BR');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('BR', privateKey, {
      user_email: 'pruebafraude@fraude.com',
      amount: 5500,
      shipping_address2: 'Rua B',
    });
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeProcessorBR,
      merchantId,
      merchantToken
    );
    await apiCallNewman.configDynamicRoutingWithFraud(
      CLEARSALE_BRASIL_FRAUD_PROCESSOR_BODY,
      DYNAMIC_ROUTING_CLEARSALE_BRASIL_ALL_RISKS_RULE_BODY,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1909 Procesar una transacción con motor de fraude Clearsale Brasil denegada por valor mayor que 50',
    {
      tag: ['@fraud', '@admin_connection', '@admin-preprod', '@team_payments_capabilities', '@api'],
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
            processorName: processorsConfig.stripeProcessorBR.name,
            card: {
              ...creditCardData.stripeVisaSuccessfulFraudReprove,
              document_number: '51682247503',
            },
            token: orderToken,
          })
        );
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('It validates that the fraud decision is respectively correct: processor, risk_level, fraud_decision', async () => {
        await retryGetFraudDecision(emaService, privateKey, orderToken, {
          processor: ConnectionsAvailable.clearsalebrasil,
          risk: 'low',
          decision: 'low_risk',
        });
      });
    }
  );
});
