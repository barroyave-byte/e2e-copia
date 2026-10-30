import { test, expect } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { kushkiVisaSuccessfull } from '@support/interfaces/credit_cards';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';
import { USE_DYNAMIC_ROUTING_ENABLED } from '@support/http/testData/payment/PaymentMerchantConfigurations';
import { SiftAntiFraudProcessor } from '@support/http/testData/guard/AntiFraudProcessors';

const configMerchant = new ConfigMerchant();

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let orderId: string;
let transactionId: string;
let responsePurchase: any;
let paymentRuleId: string;

test.describe('@regression Pays in dynamic routing con checkout', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId,
      merchantToken
    );

    const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderId = tokenizeResponse.data.order.order_id;
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
  });

  test(
    '@PAYM-T2188 Purchase con dynamic routing y configuracion de procesador de fraude exitoso',
    {
      tag: [
        '@dynamic_routing',
        '@admin_connection',
        '@admin-preprod',
        '@team_payments_capabilities',
        '@api',
        '@preprod',
        '@purchase',
      ],
    },
    async ({
      paymentService,
      userAuthService,
      emaService,
      paymentRoutingService,
      guardService,
    }) => {
      await test.step('Configure Sift fraud processor connection', async () => {
        // siftFraudProcessor/apiCallNewman.createPaymentProcessor targeted payments-api's
        // /processors endpoint with a deuna-guard-shaped payload (missing payment_processor_id),
        // which payments-api correctly rejects. Anti-fraud processors are configured through
        // deuna-guard's own endpoint instead.
        await guardService.createFraudProcessor(
          merchantToken,
          merchantId,
          merchantName,
          SiftAntiFraudProcessor
        );
      });

      await test.step('Configure payment strategy with dynamic routing and fraud processor', async () => {
        await paymentService.configurationMerchantPayments({
          merchantToken,
          merchantId,
          storeId: 'all',
          configurationMerchantPaymentsData: USE_DYNAMIC_ROUTING_ENABLED,
        });

        const fraudRoutingRule = {
          label: 'Fraud routing with Sift - PAYM-T2188',
          priority: 1,
          status: 'enabled',
          is_default: true,
          trigger: 'merchant_rule',
          ignore_next_rules: false,
          conditions: [],
          members: [{ fraud_processor: 'SIFT', sort: 1, strategy: 'cascade' }],
          children: [
            {
              conditions: [
                { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'low' },
              ],
              members: [
                {
                  processor_name: processorsConfig.kushkiProcessor.name,
                  sort: 1,
                  capabilities: null,
                  strategy: 'cascade',
                },
              ],
              ignore_next_rules: false,
            },
          ],
        };

        const ruleResponse = await paymentRoutingService.createMerchantRule(
          merchantId,
          merchantToken,
          fraudRoutingRule
        );
        paymentRuleId = ruleResponse.data.id;
      });

      await test.step('The user send purchase request', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;

        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.kushkiProcessor.name,
            card: kushkiVisaSuccessfull,
            token: orderToken,
          })
        );
      });

      await test.step('The transaction is processed successfully', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });
    }
  );
});
