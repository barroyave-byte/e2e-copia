import { expect, test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

const configMerchant = new ConfigMerchant();

const dlocalProcessorUSD = {
  name: 'dlocal',
  payment_processor_id: 9,
  enabled: true,
  currency_iso3: 'USD',
  dlocal: {
    login: '6aa495a8c2',
    trans_key: 'ecb5a3392e',
    secret_key: '811a3ab1a9bb799baec71c759abe6793e',
  },
};

const merchantRuleBody = {
  label: 'label3',
  priority: 1,
  status: 'enabled',
  is_default: false,
  trigger: 'merchant_rule',
  ignore_next_rules: false,
  conditions: [
    {
      rule_option: { id: 10, label: 'amount' },
      operator: 'lte',
      operand: '2000',
    },
  ],
  members: [
    {
      payment_processor_id: 9,
      sort: 1,
      capabilities: ['3ds'],
      strategy: 'cascade',
    },
  ],
  children: [
    {
      conditions: [
        {
          rule_option: { id: 3 },
          operator: 'eq',
          operand: 'visa',
        },
      ],
      members: [
        {
          payment_processor_id: 40,
          sort: 1,
          capabilities: ['3ds'],
          strategy: 'cascade',
        },
      ],
    },
    {
      conditions: [
        {
          rule_option: { id: 3 },
          operator: 'eq',
          operand: 'mastercard',
        },
      ],
      members: [
        {
          payment_processor_id: 11,
          sort: 1,
          capabilities: ['3ds'],
          strategy: 'cascade',
        },
      ],
    },
  ],
};

let merchantRuleId: string;

test.describe('@regression Get Merchant Rule', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ paymentRoutingService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.conektaProcessorMSI,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createPaymentProcessor(
      dlocalProcessorUSD as any,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId,
      merchantToken
    );

    const ruleResult = await paymentRoutingService.createMerchantRule(
      merchantId,
      merchantToken,
      merchantRuleBody
    );
    merchantRuleId = ruleResult.data.id;
  });

  test(
    '@PAYM-T1371 Obtener Merchant Rule por ID',
    { tag: ['@dynamic_routing', '@team_payments_capabilities'] },
    async ({ paymentRoutingService }) => {
      await test.step('Step 1: Get merchant rule by ID and validate response', async () => {
        const response = await paymentRoutingService.getMerchantRule(
          merchantId,
          merchantRuleId,
          merchantToken
        );

        expect(response.status).toBe(200);

        const rule = response.data as any;
        expect(rule.label).toBe('label3');
        expect(rule.priority).toBe(1);
        expect(rule.status).toBe('enabled');
        expect(rule.is_default).toBe(false);
        expect(rule.trigger).toBe('merchant_rule');
        expect(rule.ignore_next_rules).toBe(false);
        expect(rule.conditions).toHaveLength(1);
        expect(rule.members).toHaveLength(1);
        expect(rule.members[0].payment_processor_id).toBe(9);
        expect(rule.members[0].payment_processor_name).toBe('mercadopago');
        expect(rule.children).toHaveLength(2);
        expect(rule.children[0].conditions).toHaveLength(1);
        expect(rule.children[0].members).toHaveLength(1);
        expect(rule.children[0].members[0].payment_processor_id).toBe(40);
        expect(rule.children[0].members[0].payment_processor_name).toBe('kushki');
        expect(rule.children[1].conditions).toHaveLength(1);
        expect(rule.children[1].members).toHaveLength(1);
        expect(rule.children[1].members[0].payment_processor_id).toBe(11);
        expect(rule.children[1].members[0].payment_processor_name).toBe('conekta');
      });
    }
  );
});
