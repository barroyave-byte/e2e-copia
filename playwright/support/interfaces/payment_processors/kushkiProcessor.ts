import { BaseProcessor } from './baseProcessor';

interface KushkiProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  three_ds_processing_provider?: string;
  country_iso: string;
  doesNotProcessFranchises?: string[];
  tokenize_with_gateway?: boolean;
  exclude_cvv?: boolean;
  multiple_partial_capture?: boolean;
}

interface KushkiProcessorWithTokenization extends KushkiProcessor {
  tokenize_with_gateway: boolean;
}

const kushkiProcessor: KushkiProcessor = {
  name: 'kushkiProcessor',
  payment_processor_id: 40,
  enabled: true,
  currency_iso3: 'MXN',
  public_api_key: '40647c8c0e75436f95c76fe13a7a60ac',
  private_api_key: '78bd84d860464486b882b779d1df4812',
  allow_installments: true,
  enable_3ds_authentication: false,
  country_iso: 'MX',
};

const kushkiProcessorWithoutCvvRequired: KushkiProcessor = {
  name: 'kushkiProcessor',
  payment_processor_id: 40,
  enabled: true,
  currency_iso3: 'MXN',
  public_api_key: '40647c8c0e75436f95c76fe13a7a60ac',
  private_api_key: '78bd84d860464486b882b779d1df4812',
  allow_installments: false,
  enable_3ds_authentication: false,
  country_iso: 'MX',
  tokenize_with_gateway: true,
  exclude_cvv: true,
};

const kushkiProcessorWithDEUNAThreeDS: KushkiProcessor = {
  ...kushkiProcessor,
  enable_3ds_authentication: true,
  extra_params: {
    merchant_name: 'DEUNA',
    merchant_url: 'https://www.deuna.com/',
    merchant_category_code: '5691', // Men's and Women's Clothing Stores
    merchant_acquirer_id: '123456',
    merchant_country: 'MX',
    visa_acquirer_bin: '123456',
    mastercard_acquirer_bin: '123456',
    amex_acquirer_bin: '123456',
    diners_discover_acquirer_bin: '123456',
  },
  three_ds_processing_provider: 'deuna',
  three_ds_specific_fields: {
    acquirer_merchant_id: '123456',
  },
};

const kushkiProcessorWithDEUNAThreeDSAndTokenization: KushkiProcessor = {
  ...kushkiProcessorWithDEUNAThreeDS,
  tokenize_with_gateway: true,
};

const kushkiProcessorCO: KushkiProcessor = {
  name: 'kushkiProcessorCO',
  payment_processor_id: 40,
  enabled: true,
  currency_iso3: 'COP',
  public_api_key: 'c21ee0b7e26642228918530d61e7ae3f',
  private_api_key: '6a31926ac75f41cda25b17d863751127',
  allow_installments: true,
  enable_3ds_authentication: false,
  country_iso: 'CO',
};

const kushkiProcessorWithExcludedFranchises: KushkiProcessor = {
  ...kushkiProcessor,
  name: 'kushkiProcessorWithExcludedFranchises',
  doesNotProcessFranchises: ['diners club international', 'discover', 'amex'],
};

const kushkiProcessorPE: KushkiProcessor = {
  name: 'kushkiProcessorPE',
  payment_processor_id: 40,
  enabled: true,
  currency_iso3: 'PEN',
  public_api_key: '12a5e2a98829459e97c57f55701061d0',
  private_api_key: '79f7496c972f4f419769d2212f283ed9',
  allow_installments: true,
  enable_3ds_authentication: false,
  country_iso: 'PE',
};

const kushkiProcessorCL: KushkiProcessor = {
  name: 'kushkiProcessorCL',
  payment_processor_id: 40,
  enabled: true,
  currency_iso3: 'CLP',
  public_api_key: '07b5bebb93124ab394114dca663819dd',
  private_api_key: '5d6c110a0a8f45a6a677440cb32c6e5c',
  allow_installments: true,
  enable_3ds_authentication: false,
  country_iso: 'CL',
};

const kushkiProcessorAuthorizeCL: KushkiProcessor = {
  ...kushkiProcessorCL,
  name: 'kushkiProcessorAuthorizeCL',
  automatic_capture: false,
};

const kushkiProcessorEC: KushkiProcessor = {
  name: 'kushkiProcessorEC',
  payment_processor_id: 40,
  enabled: true,
  currency_iso3: 'USD',
  public_api_key: 'ac0de247153742d78ec3139a86a6805f',
  private_api_key: '6b3504b8a6c84518bd44ce9439f1b9cf',
  allow_installments: true,
  enable_3ds_authentication: false,
  country_iso: 'EC',
};

const kushki3dsProcessorPE: KushkiProcessor = {
  ...kushkiProcessorPE,
  name: 'kushki3dsProcessorPE',
  enable_3ds_authentication: true,
};

const kushkiProcessorAuthorizePE: KushkiProcessor = {
  ...kushkiProcessorPE,
  name: 'kushkiProcessorAuthorizePE',
  automatic_capture: false,
  country_iso: 'PE',
};

const kushkiProcessorAuthorizeCO: KushkiProcessor = {
  ...kushkiProcessorCO,
  name: 'kushkiProcessorAuthorizeCO',
  automatic_capture: false,
  country_iso: 'CO',
};

const kushki3dsProcessor: KushkiProcessor = {
  ...kushkiProcessor,
  name: 'kushki3dsProcessor',
  enable_3ds_authentication: true,
};

const kushkiProcessorAuthorize: KushkiProcessor = {
  ...kushkiProcessor,
  name: 'kushkiProcessorAuthorize',
  automatic_capture: false,
  country_iso: 'MX',
};

const kushkiProcessorAuthorizeMPC: KushkiProcessor = {
  ...kushkiProcessor,
  name: 'kushkiProcessorAuthorize',
  automatic_capture: false,
  country_iso: 'MX',
  multiple_partial_capture: true,
  multiple_partial_capture_mode: 'offline',
  transaction_config: {
    capture_cutoff_days: 7,
  },
};

const kushkiProcessorAuthorizeMPCNewInfo: KushkiProcessor = {
  ...kushkiProcessor,
  name: 'kushkiProcessorAuthorize',
  automatic_capture: false,
  country_iso: 'MX',
  multiple_partial_capture: true,
  multiple_partial_capture_mode: 'offline',
  transaction_config: {
    capture_cutoff_days: 8,
  },
};

const kushkiProcessorTokenizationPE: KushkiProcessorWithTokenization = {
  ...kushkiProcessorPE,
  name: 'kushkiProcessorTokenizationPE',
  tokenize_with_gateway: true,
};

export {
  kushkiProcessor,
  kushki3dsProcessor,
  kushkiProcessorAuthorize,
  kushkiProcessorPE,
  kushki3dsProcessorPE,
  kushkiProcessorAuthorizePE,
  kushkiProcessorCO,
  kushkiProcessorAuthorizeCO,
  kushkiProcessorCL,
  kushkiProcessorAuthorizeCL,
  kushkiProcessorEC,
  kushkiProcessorTokenizationPE,
  kushkiProcessorWithExcludedFranchises,
  kushkiProcessorWithDEUNAThreeDS,
  kushkiProcessorWithDEUNAThreeDSAndTokenization,
  kushkiProcessorWithoutCvvRequired,
  KushkiProcessor,
  kushkiProcessorAuthorizeMPC,
  kushkiProcessorAuthorizeMPCNewInfo,
};
