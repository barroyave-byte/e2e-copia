import * as crypto from 'crypto';

/** Fake credentials — simulates "configure fake connection" UI step */
export const CYBERSOURCE_FRAUD_PROCESSOR_FAKE_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 3,
  },
  credentials: [
    { metadata_id: 1, value: 'c4159aba-9d6e-488f-87f8-8d21aecacc4d' },
    { metadata_id: 2, value: 'dm_fake_dm' },
    { metadata_id: 6, value: 'zcAcq8HrD4+DO+M7iJxoWfHpucAwJDNnh4Sc2jR52z8=' },
    { metadata_id: 7, value: 'test' },
    { metadata_id: 35, value: 'no' },
    { metadata_id: 36, value: 'no' },
  ],
};

export const CYBERSOURCE_FRAUD_PROCESSOR_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 3,
  },
  credentials: [
    { metadata_id: 1, value: 'c4159aba-9d6e-488f-87f8-8d21aecacc4d' },
    { metadata_id: 2, value: 'deuna_dm' },
    { metadata_id: 6, value: 'zcAcq8HrD4+DO+M7iJxoWfHpucAwJDNnh4Sc2jR52z8=' },
    { metadata_id: 7, value: 'test' },
    { metadata_id: 35, value: 'no' },
    { metadata_id: 36, value: 'no' },
  ],
};

export const CYBERSOURCE_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 3,
  },
  credentials: [
    { metadata_id: 1, value: 'c4159aba-9d6e-488f-87f8-8d21aecacc4d' },
    { metadata_id: 2, value: 'deuna_dm' },
    { metadata_id: 6, value: 'zcAcq8HrD4+DO+M7iJxoWfHpucAwJDNnh4Sc2jR52z8=' },
    { metadata_id: 7, value: 'test' },
    { metadata_id: 35, value: 'no' },
    { metadata_id: 36, value: 'no' },
  ],
  manual_review_configuration: {
    manual_review: true,
    execute_endpoints: true,
  },
};

export const DYNAMIC_ROUTING_CYBERSOURCE_FRAUD_RULE_BODY = {
  label: 'default cybersource rule',
  priority: 1,
  status: 'enabled',
  is_default: true,
  trigger: 'merchant_rule',
  ignore_next_rules: false,
  conditions: [],
  members: [{ fraud_processor: 'CYBERSOURCE', sort: 1, strategy: 'cascade' }],
  children: [
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'high' },
      ],
      members: [],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'medium' },
      ],
      members: [],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'low' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
  ],
};

/** All three risk levels mapped to Stripe Direct — replicates UI routing for high/medium/low risk tests */
export const DYNAMIC_ROUTING_CYBERSOURCE_ALL_RISKS_RULE_BODY = {
  label: 'default cybersource rule',
  priority: 1,
  status: 'enabled',
  is_default: true,
  trigger: 'merchant_rule',
  ignore_next_rules: false,
  conditions: [],
  members: [{ fraud_processor: 'CYBERSOURCE', sort: 1, strategy: 'cascade' }],
  children: [
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'high' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'medium' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'low' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
  ],
};

/** Risk levels a default fraud rule branches on. */
const FRAUD_RISK_LEVELS = ['high', 'medium', 'low'] as const;

/** Rule option the routing service keys the fraud risk condition by. */
const FRAUD_RISK_RULE_OPTION = { id: 15, label: 'fraud_risk' };

/**
 * Builds the default routing rule that evaluates `fraudProcessor` and then sends every risk
 * level to the same payment processor.
 *
 * The hand-written `DYNAMIC_ROUTING_*_ALL_RISKS_RULE_BODY` constants above differ from each
 * other only in the label, the fraud engine and the hardcoded processor id, so a test that
 * needs a different PSP would otherwise have to copy the whole tree to change one number.
 */
export function buildAllRisksFraudRoutingRule(
  fraudProcessor: string,
  paymentProcessorId: number
): Record<string, unknown> {
  return {
    label: `default ${fraudProcessor.toLowerCase()} rule`,
    priority: 1,
    status: 'enabled',
    is_default: true,
    trigger: 'merchant_rule',
    ignore_next_rules: false,
    conditions: [],
    members: [{ fraud_processor: fraudProcessor, sort: 1, strategy: 'cascade' }],
    children: FRAUD_RISK_LEVELS.map((riskLevel) => ({
      conditions: [{ rule_option: FRAUD_RISK_RULE_OPTION, operator: 'eq', operand: riskLevel }],
      members: [
        {
          payment_processor_id: paymentProcessorId,
          sort: 1,
          capabilities: null,
          strategy: 'cascade',
        },
      ],
      ignore_next_rules: false,
    })),
  };
}

export const RISKIFIED_FRAUD_PROCESSOR_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 8,
  },
  credentials: [
    { metadata_id: 17, value: 'deuna_test.com' },
    { metadata_id: 7, value: 'test' },
    { metadata_id: 1, value: '61520c2a7a2836cd0afaa665ec187db3' },
    { metadata_id: 37, value: 'no' },
  ],
};

export const RISKIFIED_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 8,
  },
  credentials: [
    { metadata_id: 17, value: 'deuna_test.com' },
    { metadata_id: 7, value: 'test' },
    { metadata_id: 1, value: '61520c2a7a2836cd0afaa665ec187db3' },
    { metadata_id: 37, value: 'no' },
  ],
  manual_review_configuration: {
    manual_review: true,
    execute_endpoints: true,
  },
};

export const DYNAMIC_ROUTING_RISKIFIED_RULE_BODY = {
  label: 'default riskified rule',
  priority: 1,
  status: 'enabled',
  is_default: true,
  trigger: 'merchant_rule',
  ignore_next_rules: false,
  conditions: [],
  members: [{ fraud_processor: 'RISKIFIED', sort: 1, strategy: 'cascade' }],
  children: [
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'high' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'medium' },
      ],
      members: [],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'low' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
  ],
};

/** Fake credentials — simulates "configure fake connection" UI step */
export const CLEARSALE_FRAUD_PROCESSOR_FAKE_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 4,
  },
  credentials: [
    { metadata_id: 1, value: 'EGBR74K9-2E1E-4CFF-89CF-EHU5673KFYT9' },
    { metadata_id: 2, value: 'fake.client.id' },
    { metadata_id: 6, value: 't7Gr28kTT0' },
    { metadata_id: 7, value: 'test' },
  ],
};

/** Real credentials (equivalent to "update real connection" + activateManualReview + activateOpsAutoExecution) */
export const CLEARSALE_FRAUD_PROCESSOR_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 4,
  },
  credentials: [
    { metadata_id: 1, value: '2E747CE7-2E1E-4CFF-89CF-27E95F951DF1' },
    { metadata_id: 2, value: 'deuna.sandbox' },
    { metadata_id: 6, value: 'k3G9R0D5lz' },
    { metadata_id: 7, value: 'test' },
  ],
};

/** Real credentials with manual review enabled (equivalent to activateManualReview + activateOpsAutoExecution) */
export const CLEARSALE_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 4,
  },
  credentials: [
    { metadata_id: 1, value: '2E747CE7-2E1E-4CFF-89CF-27E95F951DF1' },
    { metadata_id: 2, value: 'deuna.sandbox' },
    { metadata_id: 6, value: 'k3G9R0D5lz' },
    { metadata_id: 7, value: 'test' },
  ],
  manual_review_configuration: {
    manual_review: true,
    execute_endpoints: true,
  },
};

export const DYNAMIC_ROUTING_CLEARSALE_RULE_BODY = {
  label: 'default clearsale rule',
  priority: 1,
  status: 'enabled',
  is_default: true,
  trigger: 'merchant_rule',
  ignore_next_rules: false,
  conditions: [],
  members: [{ fraud_processor: 'CLEARSALE', sort: 1, strategy: 'cascade' }],
  children: [
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'high' },
      ],
      members: [],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'medium' },
      ],
      members: [],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'low' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
  ],
};

export const ACCERTIFY_FRAUD_PROCESSOR_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 9,
  },
  credentials: [
    { metadata_id: 10, value: 'volaris_icnow_dev_nav' },
    { metadata_id: 11, value: 'W9jQ7$Fq7' },
    { metadata_id: 7, value: 'test' },
  ],
};

export const DYNAMIC_ROUTING_ACCERTIFY_RULE_BODY = {
  label: 'default accertify rule',
  priority: 1,
  status: 'enabled',
  is_default: true,
  trigger: 'merchant_rule',
  ignore_next_rules: false,
  conditions: [],
  members: [{ fraud_processor: 'ACCERTIFY', sort: 1, strategy: 'cascade' }],
  children: [
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'high' },
      ],
      members: [],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'medium' },
      ],
      members: [],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'low' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
  ],
};

export const CLEARSALE_BRASIL_FRAUD_PROCESSOR_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 5,
  },
  credentials: [
    { metadata_id: 2, value: 'DeunaTG' },
    { metadata_id: 6, value: 'KnrsXReUZx' },
    { metadata_id: 7, value: 'test' },
  ],
};

/** All three risk levels mapped to Stripe Direct — replicates UI routing for high/medium/low risk tests */
export const DYNAMIC_ROUTING_CLEARSALE_BRASIL_ALL_RISKS_RULE_BODY = {
  label: 'default clearsale brasil rule',
  priority: 1,
  status: 'enabled',
  is_default: true,
  trigger: 'merchant_rule',
  ignore_next_rules: false,
  conditions: [],
  members: [{ fraud_processor: 'CLEARSALE-BRASIL', sort: 1, strategy: 'cascade' }],
  children: [
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'high' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'medium' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'low' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
  ],
};

/** All three risk levels mapped to Stripe Direct — replicates UI routing for high/medium/low risk tests */
export const DYNAMIC_ROUTING_CLEARSALE_ALL_RISKS_RULE_BODY = {
  label: 'default clearsale rule',
  priority: 1,
  status: 'enabled',
  is_default: true,
  trigger: 'merchant_rule',
  ignore_next_rules: false,
  conditions: [],
  members: [{ fraud_processor: 'CLEARSALE', sort: 1, strategy: 'cascade' }],
  children: [
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'high' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'medium' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'low' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
  ],
};

/** Fake credentials — simulates "configure fake connection" UI step */
export const SIGNIFYD_FRAUD_PROCESSOR_FAKE_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 2,
  },
  credentials: [
    { metadata_id: 34, value: 'No' },
    { metadata_id: 5, value: 'organifake_fake' },
    { metadata_id: 1, value: 'ERT8yYPeOJEZWxwlmfcdebtr94q9YBBV' },
    { metadata_id: 22, value: 'FRAUD,INR' },
    { metadata_id: 23, value: 'SIGNIFYD_RECOMMENDATION' },
    { metadata_id: 24, value: '0' },
    { metadata_id: 25, value: '0' },
    { metadata_id: 26, value: '0' },
    { metadata_id: 27, value: '0' },
    { metadata_id: 28, value: '0' },
    { metadata_id: 29, value: '0' },
    { metadata_id: 30, value: '0' },
    { metadata_id: 31, value: '0' },
    { metadata_id: 32, value: '0' },
    { metadata_id: 33, value: '0' },
  ],
};

/** Real credentials (equivalent to "update real connection" + activateManualReview + activateOpsAutoExecution) */
export const SIGNIFYD_FRAUD_PROCESSOR_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 2,
  },
  credentials: [
    { metadata_id: 34, value: 'No' },
    { metadata_id: 5, value: 'deuna_dm' },
    { metadata_id: 1, value: 'aKrFbVJqLvSte6GYNAtvBdaP0pVwFqOd' },
    { metadata_id: 22, value: 'FRAUD,INR' },
    { metadata_id: 23, value: 'SIGNIFYD_RECOMMENDATION' },
    { metadata_id: 24, value: '0' },
    { metadata_id: 25, value: 'seller.com' },
    { metadata_id: 26, value: '2023-01-15' },
    { metadata_id: 27, value: 'seller@example.com' },
    { metadata_id: 28, value: '+1234567890' },
    { metadata_id: 29, value: '123 Main St' },
    { metadata_id: 30, value: '12345' },
    { metadata_id: 31, value: 'New York' },
    { metadata_id: 32, value: 'NY' },
    { metadata_id: 33, value: 'US' },
  ],
};

export const DYNAMIC_ROUTING_SIGNIFYD_RULE_BODY = {
  label: 'default signifyd rule',
  priority: 1,
  status: 'enabled',
  is_default: true,
  trigger: 'merchant_rule',
  ignore_next_rules: false,
  conditions: [],
  members: [{ fraud_processor: 'SIGNIFYD', sort: 1, strategy: 'cascade' }],
  children: [
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'high' },
      ],
      members: [],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'medium' },
      ],
      members: [],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'low' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
  ],
};

export const CYBERSOURCE_FRAUD_PROCESSOR_BILLING_UPPERCASE_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 3,
  },
  merchant_custom_information: {
    get_full_name_billing_address_uppercase: '31',
    metadata: {
      'additional_data.mdd_1': '1',
      'additional_data.mdd_2': '2',
      'additional_data.mdd_3': '3',
      'additional_data.mdd_4': '4',
      'additional_data.mdd_5': '5',
      'additional_data.mdd_7': '7',
      'additional_data.mdd_8': '8',
      'additional_data.mdd_13': '13',
      'additional_data.mdd_14': '14',
      'additional_data.mdd_15': '15',
      'additional_data.mdd_16': '16',
      'additional_data.mdd_17': '17',
    },
  },
  credentials: [
    { metadata_id: 1, value: 'c4159aba-9d6e-488f-87f8-8d21aecacc4d' },
    { metadata_id: 2, value: 'deuna_dm' },
    { metadata_id: 6, value: 'zcAcq8HrD4+DO+M7iJxoWfHpucAwJDNnh4Sc2jR52z8=' },
    { metadata_id: 7, value: 'test' },
  ],
};

export const SIFT_FRAUD_PROCESSOR_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 1,
  },
  credentials: [
    { metadata_id: 1, value: '4acd8936ec18cffc' },
    { metadata_id: 5, value: '60d362a574be22423cfbe776' },
  ],
};

/** Fake credentials — used to simulate an initial wrong configuration before the update test */
export const SIFT_FRAUD_PROCESSOR_FAKE_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 1,
  },
  credentials: [
    { metadata_id: 1, value: '4acd8tegb4568ffc' },
    { metadata_id: 5, value: '59hgdsa574be224234tgryuu' },
  ],
};

/** Real credentials with manual review enabled (equivalent to activateManualReview + activateOpsAutoExecution) */
export const SIFT_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 1,
  },
  credentials: [
    { metadata_id: 1, value: '4acd8936ec18cffc' },
    { metadata_id: 5, value: '60d362a574be22423cfbe776' },
  ],
  manual_review_configuration: {
    manual_review: true,
    execute_endpoints: true,
  },
};

export const DYNAMIC_ROUTING_SIFT_RULE_BODY = {
  label: 'default sift rule',
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
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'high' },
      ],
      members: [],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'medium' },
      ],
      members: [],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'low' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
  ],
};

/** All three risk levels mapped to Stripe Direct — replicates UI routing for high/medium/low risk tests */
export const DYNAMIC_ROUTING_SIFT_ALL_RISKS_RULE_BODY = {
  label: 'default sift rule',
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
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'high' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'medium' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'low' },
      ],
      members: [{ payment_processor_id: 50, sort: 1, capabilities: null, strategy: 'cascade' }],
      ignore_next_rules: false,
    },
  ],
};

export const DYNAMIC_ROUTING_FRAUD_RULE_BODY = {
  label: 'some rule',
  priority: 1,
  status: 'enabled',
  is_default: true,
  trigger: 'merchant_rule',
  ignore_next_rules: false,
  conditions: [],
  members: [{ fraud_processor: 'CYBERSOURCE', sort: 1, strategy: 'cascade' }],
  children: [
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'high' },
      ],
      members: [],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'medium' },
      ],
      members: [],
      ignore_next_rules: false,
    },
    {
      conditions: [
        { rule_option: { id: 15, label: 'fraud_risk' }, operator: 'eq', operand: 'low' },
      ],
      members: [],
      ignore_next_rules: false,
    },
  ],
};

export const buildFailedPurchaseBody = () => ({
  transaction_id: crypto.randomUUID(),
  method_type: 'credit_card',
  amount: 1000,
  email: 'jcallataxi@deuna.io',
  credit_card: {
    expiry_month: '11',
    expiry_year: '2025',
    card_holder: 'Duna Developers',
    card_holder_dni: '185396924',
    card_holder_number: '310.555.124',
    card_number: '4168818844447115',
    card_cvv: '124',
    address1: 'Vergara 548',
    zip: '001100',
    city: 'santiago',
    state: 'rm',
    country: 'cl',
    phone: '12345755',
  },
  order_token: 'c479fb9d-fb00-4c66-8c7b-95e13d07ad4a',
  device_id: 'e501e867-8ea4-4558-bf66-7eaa8c43cc7f',
  complementary_data: {
    shipping_address: {
      email: 'Ronny_Hauck@yahoo.com',
      identification: '050623568956124',
      id: '1234',
      user_id: 'ebd6105c-b2ae-11eb-8529-0242ac130003',
      first_name: 'NELSON',
      last_name: 'JIMENEZ',
      phone: '593986100449',
      identity_document: '1150218418',
      lat: -0.100032,
      lng: -78.46956,
      address1: 'Av. Eloy Alfaro 14, Quito 170515, Ecuador SHIPPING',
      address2: 'Av. Eloy Alfaro 14, Quito 170515, Ecuador',
      city: 'Quito',
      zipcode: '170515',
      state_name: '',
      country: 'EC',
      additional_description: 'Descripción adicional',
      address_type: 'home',
      is_default: false,
      created_at: '2021-11-03T22:09:09.086990957Z',
      updated_at: '2021-11-03T22:09:09.087014623Z',
    },
    currency_code: 'USD',
    billing_address: {
      email: 'Antoinette.Kuphal@yahoo.com',
      identification: '050623568956124',
      id: '1234',
      user_id: 'ebd6105c-b2ae-11eb-8529-0242ac130003',
      first_name: 'NELSON',
      last_name: 'JIMENEZ',
      phone: '593986100449',
      identity_document: '1150218418',
      lat: -0.100032,
      lng: -78.46956,
      address1: 'Av. Eloy Alfaro 14, Quito 170515, Ecuador BILLING',
      address2: 'Av. Eloy Alfaro 14, Quito 170515, Ecuador',
      city: 'Quito',
      zipcode: '170515',
      state_name: '',
      country: 'EC',
      additional_description: 'Descripción adicional',
      address_type: 'home',
      is_default: false,
      created_at: '2021-11-03T22:09:09.086990957Z',
      updated_at: '2021-11-03T22:09:09.087014623Z',
    },
  },
  metadata: { vtex_device_fingerprint: 'abc123' },
});

export const TRIM_RULE_IN_BODY = {
  label: 'default rule',
  priority: 1,
  status: 'enabled',
  is_default: false,
  trigger: 'payment',
  ignore_next_rules: false,
  conditions: [
    {
      rule_option: { id: 1, label: 'bank' },
      operator: 'in',
      operand: ' banco 1; banco 2   ; banco3 ',
    },
  ],
  members: [{ payment_processor_id: 40, sort: 1, capabilities: null, strategy: 'cascade' }],
};

export const TRIM_EVALUATE_TRIGGER_BODY = {
  transaction_id: '',
  method_type: 'credit_card',
  amount: 1000,
  card_info: {
    bin: '457444',
    bank: 'banco 1',
    branch: 'visa',
    card_type: 'credit',
    card_cvv: '123',
  },
};

export const CONTAINS_RULE_BODY = {
  label: 'rule with cointains',
  priority: 1,
  status: 'enabled',
  is_default: false,
  trigger: 'payment',
  ignore_next_rules: false,
  conditions: [
    {
      rule_option: { id: 16, label: 'metadata' },
      operator: 'contains',
      operand: 'room1;room2',
      metadata_field_name: 'room_name',
      metadata_field_type: 'text',
    },
  ],
  members: [{ payment_processor_id: 40, sort: 1, capabilities: null, strategy: 'cascade' }],
};

export const CONTAINS_EVALUATE_TRIGGER_BODY = {
  transaction_id: '',
  method_type: 'credit_card',
  amount: 1000,
  card_info: {
    bin: '457444',
    bank: 'banco 1',
    branch: 'visa',
    card_type: 'credit',
    card_cvv: '123',
  },
  metadata: { room_name: ['room1', 'room3', 'room5'] },
};

/**
 * Fraud engines that can be provisioned with manual review turned on, keyed by the engine name
 * the routing service expects in `members[].fraud_processor`.
 */
export const FRAUD_MANUAL_REVIEW_PROCESSOR_BODIES = {
  CYBERSOURCE: CYBERSOURCE_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY,
  CLEARSALE: CLEARSALE_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY,
  RISKIFIED: RISKIFIED_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY,
  SIFT: SIFT_FRAUD_PROCESSOR_MANUAL_REVIEW_BODY,
} as const;

export type FraudManualReviewEngine = keyof typeof FRAUD_MANUAL_REVIEW_PROCESSOR_BODIES;
