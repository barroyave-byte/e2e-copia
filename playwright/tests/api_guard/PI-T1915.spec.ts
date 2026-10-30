import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import {
  retryGetOrderStatus,
  retryGetFraudDecision,
  retryGetFraudProcessor,
} from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

const configMerchant = new ConfigMerchant();

const RISKIFIED_CASES = [
  {
    name: 'low risk',
    tokenizeEmail: 'dlora@deuna.com',
    purchaseEmail: undefined,
    amount: 4990,
    card: creditCardData.stripeVisaSuccessfulFraudAprove,
    risk: 'low',
    decision: 'low_risk',
  },
  {
    name: 'high risk',
    tokenizeEmail: 'declinetest@gmail.com',
    purchaseEmail: 'declinetest@gmail.com',
    amount: 4990,
    card: creditCardData.stripeVisaSuccessful,
    risk: 'high',
    decision: 'high_risk',
  },
] as const;

test.describe('@regression feature to validate with the automated test case', () => {
  test(
    '@PI-T1915 Procesar una transacción con motor de fraude riskified low risk y high risk',
    {
      tag: ['@fraud', '@admin_connection', '@admin-preprod', '@team_payments_capabilities', '@api'],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      for (const fraudCase of RISKIFIED_CASES) {
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
              user_email: fraudCase.tokenizeEmail,
              amount: fraudCase.amount,
            });
            orderToken = tokenizeResponse.data.token;
            await apiCallNewman.createPaymentProcessor(
              processorsConfig.stripeProcessor,
              merchantId,
              merchantToken
            );
            await apiCallNewman.configDynamicRoutingWithRiskified(merchantId, merchantToken);
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
                email: fraudCase.purchaseEmail,
              })
            );
          });

          await test.step('The transaction is processed', async () => {
            expect(responsePurchase.status).toBe(200);
            await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
          });

          await test.step('It validates that the fraud processor is riskified', async () => {
            await retryGetFraudProcessor(
              emaService,
              privateKey,
              orderToken,
              ConnectionsAvailable.riskified
            );
          });

          await test.step('It validates that the fraud decision is respectively correct: processor, risk_level, fraud_decision', async () => {
            await retryGetFraudDecision(emaService, privateKey, orderToken, {
              processor: ConnectionsAvailable.riskified,
              risk: fraudCase.risk,
              decision: fraudCase.decision,
            });
          });
        });
      }
    }
  );
});
