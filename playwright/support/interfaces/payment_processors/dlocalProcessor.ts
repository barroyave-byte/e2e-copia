import { BaseProcessor } from './baseProcessor';

export interface DlocalProcessor extends BaseProcessor {
  automatic_capture: boolean;
  allow_installments?: boolean;
  country_iso?: string;
  dlocal?: {
    login: string;
    trans_key: string;
    secret_key: string;
  };
  multiple_partial_capture_mode?: string;
  capture_cutoff_days?: number;
}

const dlocalProcessor: DlocalProcessor = {
  name: 'dlocal',
  payment_processor_id: 5,
  enabled: true,
  currency_iso3: 'CLP',
  country_iso: 'CL',
  automatic_capture: true,
  allow_installments: true,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  dlocal: {
    secret_key: '6aa495a8c2',
    trans_key: 'ecb5a3392e',
    login: '811a3ab1a9bb799baec71c759abe6793e',
  },
};

const dlocalProcessorMX: DlocalProcessor = {
  name: 'dlocal',
  payment_processor_id: 5,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  automatic_capture: true,
  allow_installments: true,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  dlocal: {
    secret_key: '6aa495a8c2',
    trans_key: 'ecb5a3392e',
    login: '811a3ab1a9bb799baec71c759abe6793e',
  },
};

const dlocalProcessorPE: DlocalProcessor = {
  name: 'dlocal-alternative',
  payment_processor_id: 5,
  enabled: true,
  currency_iso3: 'PEN',
  country_iso: 'PE',
  automatic_capture: true,
  allow_installments: true,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  dlocal: {
    secret_key: 'wcuiuCgEpR',
    trans_key: 'VpZcNFjOA5',
    login: '9UqgMmSr5JUdAz3uIAj0CC2zXvPBrjfNx',
  },
};

const dlocalProcessorEC: DlocalProcessor = {
  name: 'dlocal-ecuador',
  payment_processor_id: 5,
  enabled: true,
  currency_iso3: 'USD',
  country_iso: 'EC',
  automatic_capture: true,
  allow_installments: true,
  dlocal: {
    secret_key: '8219Y0pAZ9RRtdQEre4xfn2GjKtB9LwBX',
    trans_key: 'aUkjyk5PKl',
    login: 'fXYUT6oDIy',
  },
};

const dlocalProcessorAdminEC: DlocalProcessor = {
  name: 'dlocal-ecuador',
  payment_processor_id: 5,
  enabled: true,
  currency_iso3: 'USD',
  country_iso: 'EC',
  automatic_capture: true,
  allow_installments: true,
  dlocal: {
    login: 'fXYUT6oDIy',
    trans_key: 'aUkjyk5PKl',
    secret_key: '8219Y0pAZ9RRtdQEre4xfn2GjKtB9LwBX',
  },
};

const dlocalProcessorUY: DlocalProcessor = {
  name: 'dlocal-uruguay',
  payment_processor_id: 5,
  enabled: true,
  currency_iso3: 'UYU',
  country_iso: 'UY',
  automatic_capture: true,
  allow_installments: true,
  dlocal: {
    login: 'fXYUT6oDIy',
    trans_key: 'aUkjyk5PKl',
    secret_key: '8219Y0pAZ9RRtdQEre4xfn2GjKtB9LwBX',
  },
};

const dlocalProcessorAdminUY: DlocalProcessor = {
  name: 'dlocal-uruguay',
  payment_processor_id: 5,
  enabled: true,
  currency_iso3: 'UYU',
  country_iso: 'UY',
  automatic_capture: true,
  allow_installments: true,
  dlocal: {
    secret_key: '9UqgMmSr5JUdAz3uIAj0CC2zXvPBrjfNx',
    trans_key: 'VpZcNFjOA5',
    login: 'wcuiuCgEpR',
  },
};

const dlocalProcessorAdminCL: DlocalProcessor = {
  name: 'dlocal-uruguay',
  payment_processor_id: 5,
  enabled: true,
  currency_iso3: 'CLP',
  country_iso: 'CL',
  automatic_capture: true,
  allow_installments: true,
  dlocal: {
    secret_key: '9UqgMmSr5JUdAz3uIAj0CC2zXvPBrjfNx',
    trans_key: 'VpZcNFjOA5',
    login: 'wcuiuCgEpR',
  },
};


const dlocalProcessorAuthorize: DlocalProcessor = {
  ...dlocalProcessor,
  automatic_capture: false,
  country_iso: 'CL',
};

const dlocalProcessorPayconnectUY: DlocalProcessor = {
  name: 'dlocal-payconnect',
  payment_processor_id: 5,
  enabled: true,
  currency_iso3: 'USD',
  country_iso: 'UY',
  automatic_capture: true,
  allow_installments: true,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  external_merchant_id: '9UqgMmSr5JUdAz3uIAj0CC2zXvPBrjfNx',
  private_api_key: 'wcuiuCgEpR',
  public_api_key: 'VpZcNFjOA5',
  merchant_pwd: '7c9465ebb40b4f3a95fd5041bc8701e2',
  dlocal: {
    secret_key: '1sMoZj3hfRQoj1uXkr4ftOREJT3pM1UiX',
    trans_key: 'zGtUj8a0Vt',
    login: 'Oew2BBP9HK',
  },
};

const dlocalProcessorPayconnectCL: DlocalProcessor = {
  name: 'dlocal-payconnect',
  payment_processor_id: 5,
  enabled: true,
  currency_iso3: 'CLP',
  country_iso: 'CL',
  automatic_capture: true,
  allow_installments: true,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  external_merchant_id: '9UqgMmSr5JUdAz3uIAj0CC2zXvPBrjfNx',
  private_api_key: 'wcuiuCgEpR',
  public_api_key: 'VpZcNFjOA5',
  merchant_pwd: '7c9465ebb40b4f3a95fd5041bc8701e2',
  dlocal: {
    secret_key: '1sMoZj3hfRQoj1uXkr4ftOREJT3pM1UiX',
    trans_key: 'zGtUj8a0Vt',
    login: 'Oew2BBP9HK',
  },
};

const dlocalProcessorPayconnectUYCurrencyUYU: DlocalProcessor = {
  ...dlocalProcessorPayconnectUY,
  currency_iso3: 'UYU',
};

const dlocalProcessorPayconnectMXAuthorize: DlocalProcessor = {
  ...dlocalProcessorMX,
  automatic_capture: false,
  country_iso: 'MX',
  currency_iso3: 'MXN',
};

const dlocalProcessorPayconnectCLAuthorize: DlocalProcessor = {
  ...dlocalProcessorPayconnectCL,
  automatic_capture: false,
  country_iso: 'CL',
  currency_iso3: 'CLP',
};

const dlocalDebitProcessor: DlocalProcessor = {
  name: 'dlocal',
  payment_processor_id: 13,
  enabled: true,
  currency_iso3: 'CLP',
  automatic_capture: true,
  dlocal: {
    login: '6aa495a8c2',
    trans_key: 'ecb5a3392e',
    secret_key: '811a3ab1a9bb799baec71c759abe6793e',
  },
};

const dlocalPSpreedlyProcessorAuthorizeEC: DlocalProcessor = {
  name: 'DLocal TwoSteps',
  payment_processor_id: 5,
  enabled: true,
  currency_iso3: 'USD',
  country_iso: 'EC',
  automatic_capture: false,
  allow_installments: true,
  dlocal: {
    login: 'fXYUT6oDIy',
    trans_key: 'aUkjyk5PKl',
    secret_key: '8219Y0pAZ9RRtdQEre4xfn2GjKtB9LwBX',
  },
};

const dlocalPSpreedlyProcessorAuthorizeECWithMPC: DlocalProcessor = {
  name: 'DLocal TwoSteps',
  payment_processor_id: 5,
  enabled: true,
  currency_iso3: 'USD',
  country_iso: 'EC',
  automatic_capture: false,
  multiple_partial_capture_mode: 'offline',
  capture_cutoff_days: 23,
  allow_installments: true,
  dlocal: {
    secret_key: 'fXYUT6oDIy',
    trans_key: 'aUkjyk5PKl',
    login: '8219Y0pAZ9RRtdQEre4xfn2GjKtB9LwBX',
  },
};

const dlocalProcessorPayconnectAR: DlocalProcessor = {
  name: 'dlocal-payconnect',
  payment_processor_id: 5,
  enabled: true,
  currency_iso3: 'ARS',
  country_iso: 'AR',
  automatic_capture: true,
  allow_installments: true,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  external_merchant_id: '9UqgMmSr5JUdAz3uIAj0CC2zXvPBrjfNx',
  private_api_key: 'wcuiuCgEpR',
  public_api_key: 'VpZcNFjOA5',
  merchant_pwd: '7c9465ebb40b4f3a95fd5041bc8701e2',
  dlocal: {
    secret_key: '1sMoZj3hfRQoj1uXkr4ftOREJT3pM1UiX',
    trans_key: 'zGtUj8a0Vt',
    login: 'Oew2BBP9HK',
  },
};

const dlocalProcessorPayconnectARAuthorize: DlocalProcessor = {
  ...dlocalProcessorPayconnectAR,
  automatic_capture: false,
};

const dlocalProcessorPayconnectUYAuthorize: DlocalProcessor = {
  ...dlocalProcessorPayconnectUYCurrencyUYU,
  automatic_capture: false,
};

const dlocalProcessorBadCredentials: DlocalProcessor = {
  name: 'dlocal',
  payment_processor_id: 5,
  enabled: true,
  currency_iso3: 'CLP',
  country_iso: 'CL',
  automatic_capture: true,
  allow_installments: true,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  dlocal: {
    secret_key: 'Xxa495a8xX',
    trans_key: 'Xxb5a339xX',
    login: 'Xx1a3ab1a9bb799baec71c759abe679xX',
  },
};

export {
  dlocalProcessor,
  dlocalDebitProcessor,
  dlocalProcessorAuthorize,
  dlocalProcessorPE,
  dlocalProcessorEC,
  dlocalProcessorUY,
  dlocalProcessorMX,
  dlocalProcessorPayconnectUY,
  dlocalProcessorPayconnectCLAuthorize,
  dlocalPSpreedlyProcessorAuthorizeEC,
  dlocalPSpreedlyProcessorAuthorizeECWithMPC,
  dlocalProcessorAdminCL,
  dlocalProcessorAdminEC,
  dlocalProcessorAdminUY,
  dlocalProcessorPayconnectAR,
  dlocalProcessorPayconnectARAuthorize,
  dlocalProcessorPayconnectUYAuthorize,
  dlocalProcessorBadCredentials,
  dlocalProcessorPayconnectUYCurrencyUYU,
  dlocalProcessorPayconnectMXAuthorize,
};
