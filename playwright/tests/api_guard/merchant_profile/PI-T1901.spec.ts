import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus, retryGetFraudDecision } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import {
  CYBERSOURCE_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY,
  DYNAMIC_ROUTING_CYBERSOURCE_FRAUD_RULE_BODY,
  DYNAMIC_ROUTING_CYBERSOURCE_ALL_RISKS_RULE_BODY,
} from '@support/http/testData/dynamicRouting/FraudRoutingConfig';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

const configMerchant = new ConfigMerchant();

const CYBERSOURCE_CASES = [
  {
    name: 'low risk',
    email: 'dlora@deuna.com',
    amount: 4990,
    card: creditCardData.stripeVisaSuccessfulFraudAprove,
    processorFraudBody: CYBERSOURCE_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY,
    routingRuleBody: DYNAMIC_ROUTING_CYBERSOURCE_FRAUD_RULE_BODY,
    risk: 'low',
    decision: 'low_risk',
  },
  {
    name: 'high risk',
    email: 'reject@deuna.com',
    amount: 4990,
    card: creditCardData.stripeVisaSuccessfulFraudAprove,
    processorFraudBody: CYBERSOURCE_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY,
    routingRuleBody: DYNAMIC_ROUTING_CYBERSOURCE_ALL_RISKS_RULE_BODY,
    risk: 'high',
    decision: 'high_risk',
  },
] as const;

test.describe('@regression feature to validate with the automated test case', () => {
  test(
    '@PI-T1901 Procesar una transacción con motor de fraude Cybersource low risk y high risk',
    {
      tag: ['@fraud', '@admin_connection', '@admin-preprod', '@team_payments_capabilities', '@api'],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      for (const fraudCase of CYBERSOURCE_CASES) {
        await test.step(fraudCase.name, async () => {
          let merchantId: string;
          let merchantToken: string;
          let privateKey: string;
          let orderToken: string;
          let responsePurchase: any;

          await test.step('Merchant and order setup', async () => {
            const merchantConfig = await configMerchant.basicSetup('MX');
            merchantId = merchantConfig.merchantId;
            merchantToken = merchantConfig.merchantToken;
            privateKey = merchantConfig.privateKey;
            const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
              user_email: fraudCase.email,
              amount: fraudCase.amount,
            });
            orderToken = tokenizeResponse.data.token;
            await apiCallNewman.createPaymentProcessor(
              processorsConfig.stripeProcessor,
              merchantId,
              merchantToken
            );
            await apiCallNewman.configDynamicRoutingWithFraud(
              fraudCase.processorFraudBody,
              fraudCase.routingRuleBody,
              merchantId,
              merchantToken
            );
          });

          await test.step('The user send purchase request', async () => {
            const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
            const userToken = responseUserAuth.data.token;
            responsePurchase = await paymentService.purchaseV2(
              privateKey,
              userToken,
              buildPurchaseV2Payload({
                country: 'MX',
                processorName: processorsConfig.stripeProcessor.name,
                card: fraudCase.card,
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
              processor: ConnectionsAvailable.cybersourceFraud,
              risk: fraudCase.risk,
              decision: fraudCase.decision,
            });
          });
        });
      }
    }
  );
});
