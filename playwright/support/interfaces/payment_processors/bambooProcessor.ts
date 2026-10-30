import { BaseProcessor } from './baseProcessor';

interface BambooProcessor extends BaseProcessor {
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  extra_params: { [key: string]: string };
  flow?: string;
  flow_version?: string;
  multiple_partial_capture?: boolean;
}

const bambooProcessor: BambooProcessor = {
  name: 'bamboo',
  payment_processor_id: 98,
  enabled: true,
  currency_iso3: 'USD',
  country_iso: 'AR',
  automatic_capture: true,
  external_merchant_id: '5127',
  private_api_key: '4jlh_GsVsygHgIu_bU3ghbHXZ1VWfWSFuIEgIfHpyUjuDLuiPGqDLw__',
  public_api_key: 'zpoWUrSBUoTff7WfOM2x5G_I56ONV7HQ',
  allow_installments: false,
  enable_3ds_authentication: false,
  flow: 'payconnect',
  extra_params: {},
};

const bambooProcessorAR: BambooProcessor = {
  name: 'bamboo',
  payment_processor_id: 98,
  enabled: true,
  currency_iso3: 'USD',
  country_iso: 'AR',
  automatic_capture: true,
  external_merchant_id: '5271',
  private_api_key: 'LpNGGUuxZbYVvV-J1SmZwnw0dO45hl7oM6AhBpzp7ZIYFjqWy6gLUQ__',
  public_api_key: 'ljwMbzKOOyczOhjBKqbLDW_I56ONV7HQ',
  allow_installments: false,
  enable_3ds_authentication: false,
  flow: 'payconnect',
  extra_params: {},
}

const bambooProcessorPE: BambooProcessor = {
  name: 'bamboo',
  payment_processor_id: 98,
  enabled: true,
  currency_iso3: 'USD',
  country_iso: 'PE',
  automatic_capture: true,
  external_merchant_id: '5127',
  private_api_key: '4jlh_GsVsygHgIu_bU3ghbHXZ1VWfWSFuIEgIfHpyUjuDLuiPGqDLw__',
  public_api_key: 'zpoWUrSBUoTff7WfOM2x5G_I56ONV7HQ',
  allow_installments: false,
  enable_3ds_authentication: false,
  flow: 'payconnect',
  flow_version: 'workflow',
  extra_params: {},
};

const bambooProcessorUY: BambooProcessor = {
  name: 'bamboo',
  payment_processor_id: 98,
  enabled: true,
  currency_iso3: 'UYU',
  country_iso: 'UY',
  automatic_capture: true,
  external_merchant_id: '5433',
  private_api_key: 'w2DluH5MfWZbaystl_5t7pLLQQSB6U7Dt8EdqIxdliBgQDR2bW6dRQ__',
  public_api_key: 'DSXVDI9cmd4XmKia9wVbZG_I56ONV7HQ',
  allow_installments: false,
  enable_3ds_authentication: false,
  flow: 'payconnect',
  flow_version: 'workflow',
  extra_params: {},
};

const bambooAuthorizeProcessorPE: BambooProcessor = {
  ...bambooProcessorPE,
  automatic_capture: false,
};

const bambooAuthorizeProcessor: BambooProcessor = {
  ...bambooProcessor,
  automatic_capture: false,
};

const bambooAuthorizeProcessorAR: BambooProcessor = {
  ...bambooProcessorAR,
  automatic_capture: false,
  currency_iso3: 'ARS',
};

const bambooAuthorizeProcessorMPC: BambooProcessor = {
  ...bambooProcessor,
  automatic_capture: false,
  multiple_partial_capture: true,
  multiple_partial_capture_mode: 'offline',
  transaction_config: {
    capture_cutoff_days: 1,
  },
};

const bambooProcessorInARS: BambooProcessor = {
  ...bambooProcessor,
  allow_installments: true,
  currency_iso3: 'ARS',
};

const bambooAuthorizeProcessorUY: BambooProcessor = {
  ...bambooProcessorUY,
  automatic_capture: false,
};

const bambooPurchaseProcessorMPR: BambooProcessor = {
  ...bambooProcessor,
  multiple_partial_refund: true,
  transaction_config: {
    refund_cutoff_days: 1,
  },
};

const bambooAuthorizeProcessorMPR: BambooProcessor = {
  ...bambooProcessor,
  automatic_capture: false,
  multiple_partial_refund: true,
  transaction_config: {
    refund_cutoff_days: 2,
  },
};

const bambooAuthorizeProcessorMPC_MPR: BambooProcessor = {
  ...bambooProcessor,
  automatic_capture: false,
  multiple_partial_capture: true,
  multiple_partial_capture_mode: 'offline',
  multiple_partial_refund: true,
  transaction_config: {
    capture_cutoff_days: 1,
    refund_cutoff_days: 2,
  },
};

export {
  bambooProcessor,
  bambooAuthorizeProcessor,
  bambooProcessorPE,
  bambooAuthorizeProcessorPE,
  bambooProcessorInARS,
  bambooProcessorUY,
  bambooAuthorizeProcessorUY,
  bambooAuthorizeProcessorMPC,
  bambooPurchaseProcessorMPR,
  bambooAuthorizeProcessorMPR,
  bambooAuthorizeProcessorMPC_MPR,
  bambooAuthorizeProcessorAR,
};
