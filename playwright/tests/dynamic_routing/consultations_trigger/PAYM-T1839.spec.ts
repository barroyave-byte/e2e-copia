import { test, expect } from '@support/fixtures';

test.describe('@regression Consultations Trigger', () => {
  let merchantId: string;
  let merchantToken: string;
  let firstRuleId: string;
  let secondRuleId: string;

  test.beforeAll(async ({ merchantAuthService, paymentService, paymentRoutingService }) => {
    const merchant = await merchantAuthService.createBasicMerchant({ country: 'MX' });
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;

    await paymentService.createPaymentProcessor(merchantId, merchantToken, {
      name: 'conekta',
      payment_processor_id: 11,
      enabled: true,
      currency_iso3: 'MXN',
      conekta: { api_key: 'key_CzTYpBTBDQRQYvQiyoobpQ' },
    } as any);

    await paymentService.createPaymentProcessor(merchantId, merchantToken, {
      name: 'kushki',
      payment_processor_id: 40,
      enabled: true,
      currencyx_iso3: 'MXN',
      public_api_key: '40647c8c0e75436f95c76fe13a7a60ac',
      private_api_key: '78bd84d860464486b882b779d1df4812',
      identification_type: 'RFC',
      allow_installments: true,
    } as any);

    const rule1 = await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'label',
      priority: 1,
      status: 'enabled',
      is_default: false,
      trigger: 'payment',
      conditions: [
        { rule_option: { id: 10, label: 'amount' }, operator: 'lte', operand: '2000' },
        { rule_option: { id: 7, label: 'number_installments' }, operator: 'eq', operand: '3' },
      ],
      members: [{ payment_processor_id: 11, sort: 1, capabilities: ['3ds'], strategy: 'cascade' }],
    });
    firstRuleId = rule1.data.id;

    const rule2 = await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'label 2',
      priority: 2,
      status: 'enabled',
      is_default: false,
      trigger: 'payment',
      conditions: [
        { rule_option: { id: 10, label: 'amount' }, operator: 'lte', operand: '2000' },
        { rule_option: { id: 7, label: 'number_installments' }, operator: 'eq', operand: '6' },
      ],
      members: [{ payment_processor_id: 40, sort: 1, capabilities: ['3ds'], strategy: 'cascade' }],
    });
    secondRuleId = rule2.data.id;
  });

  test.afterAll(async ({ paymentRoutingService }) => {
    await paymentRoutingService.deleteMerchantRule(merchantId, firstRuleId, merchantToken);
    await paymentRoutingService.deleteMerchantRule(merchantId, secondRuleId, merchantToken);
  });

  test('@PAYM-T1839 Consultation trigger', { tag: ['@payment_routing', '@team_payments_capabilities'] }, async ({ paymentRoutingService }) => {
    await test.step('POST consultation trigger with ignored_rule_options=number_installments', async () => {
      const response = await paymentRoutingService.consultationTrigger(
        merchantId,
        merchantToken,
        {
          transaction_id: '7e3f321d-d118-4be1-8de3-15fa37aa8e90',
          method_type: 'credit_card',
          amount: 1000,
          card_info: {
            bin: '457444',
            bank: '',
            branch: 'visa',
            card_type: 'credit',
            country: 'Kuwait',
            country_iso: '',
            currency: '',
            card_cvv: '123',
          },
          store_code: 'KFC01',
        },
        'number_installments'
      );

      const data = response.data as any;
      expect(data.payment_processors.length).toBe(2);

      expect(data.payment_processors[0].payment_processor_id).toBe(11);
      expect(data.payment_processors[0].ignored_rule_options.length).toBe(1);
      expect(data.payment_processors[0].ignored_rule_options[0].rule_option).toBe('number_installments');
      expect(data.payment_processors[0].ignored_rule_options[0].operator).toBe('eq');
      expect(data.payment_processors[0].ignored_rule_options[0].value).toBe('3');

      expect(data.payment_processors[1].payment_processor_id).toBe(40);
      expect(data.payment_processors[1].ignored_rule_options.length).toBe(1);
      expect(data.payment_processors[1].ignored_rule_options[0].rule_option).toBe('number_installments');
      expect(data.payment_processors[1].ignored_rule_options[0].operator).toBe('eq');
      expect(data.payment_processors[1].ignored_rule_options[0].value).toBe('6');
    });
  });
});
