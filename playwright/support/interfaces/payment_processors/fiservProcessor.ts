import { BaseProcessor } from './baseProcessor';

interface FiservProcessor extends BaseProcessor {
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  extra_params: { [key: string]: string };
  flow?: string;
  flow_version?: string;
  mci_to_psp_as?: string;
  three_ds_internal_version?: string;
}

const fiservProcessorMX: FiservProcessor = {
  name: 'fiserv',
  payment_processor_id: 100,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  automatic_capture: true,
  external_merchant_id: '',
  public_api_key: '9NuBGh6D5XxrXLVnI0e5JutxGqOHcTOe',
  private_api_key: 'WhqEePkPtbq6PSRBWZwHcdMAgYkhXpNrhuOhzZAM1Gk',
  allow_installments: false,
  enable_3ds_authentication: false,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  extra_params: {},
};

const fiservAuthorizeProcessorMX: FiservProcessor = {
  ...fiservProcessorMX,
  automatic_capture: false,
};

const fiservProcessor3DSMX: FiservProcessor = {
  ...fiservProcessorMX,
  automatic_capture: true,
  enable_3ds_authentication: true,
  three_ds_internal_version: 'v1',
};

const fiservProcessorMSIMX: FiservProcessor = {
  ...fiservProcessorMX,
  allow_installments: true,
  mci_to_psp_as: 'MSI',
};

const fiservAuthorizeProcessorMSIMX: FiservProcessor = {
  ...fiservProcessorMX,
  automatic_capture: false,
  allow_installments: true,
  mci_to_psp_as: 'MSI',
};

const fiservProcessorMCIMX: FiservProcessor = {
  ...fiservProcessorMX,
  allow_installments: true,
  mci_to_psp_as: 'MCI',
};

const fiservAuthorizeProcessorMCIMX: FiservProcessor = {
  ...fiservProcessorMX,
  automatic_capture: false,
  allow_installments: true,
  mci_to_psp_as: 'MCI',
};

const fiservProcessorAR: FiservProcessor = {
  name: 'fiserv',
  payment_processor_id: 100,
  enabled: true,
  currency_iso3: 'ARS',
  country_iso: 'AR',
  automatic_capture: true,
  external_merchant_id: '',
  public_api_key: '2gUhlRtEsCZUR1AlTLefPgmgtBc1mxbF',
  private_api_key: 'fQ5mkLzsipGB9KBht6C6nVKmRT2ufXogD0GhPmkbKEG',
  allow_installments: false,
  enable_3ds_authentication: false,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  extra_params: {
    account_store_id: '5924100701',
  },
};

const fiservAuthorizeProcessorAR: FiservProcessor = {
  ...fiservProcessorAR,
  automatic_capture: false,
};

const fiservAuthorizeProcessorExtraParamsEmptyAR: FiservProcessor = {
  ...fiservProcessorAR,
  extra_params: {}
};

const fiservProcessor3DSAR: FiservProcessor = {
  ...fiservProcessorAR,
  automatic_capture: true,
  enable_3ds_authentication: true,
  three_ds_internal_version: 'v1',
};

const fiservProcessor3DSMPIAR: FiservProcessor = {
  ...fiservProcessorAR,
  automatic_capture: true,
  enable_3ds_authentication: false,
  public_api_key: '2gUhlRtEsCZUR1AlTLefPgmgtBc1mxbF',
  private_api_key: 'fQ5mkLzsipGB9KBht6C6nVKmRT2ufXogD0GhPmkbKEG',
  extra_params: {
    account_store_id: '5924100701',
  },
};

export {
  fiservProcessorMX,
  fiservAuthorizeProcessorMX,
  fiservProcessorMSIMX,
  fiservAuthorizeProcessorMSIMX,
  fiservProcessorMCIMX,
  fiservAuthorizeProcessorMCIMX,
  fiservProcessor3DSMX,
  fiservProcessorAR,
  fiservProcessor3DSAR,
  fiservAuthorizeProcessorAR,
  fiservAuthorizeProcessorExtraParamsEmptyAR,
  fiservProcessor3DSMPIAR,
};
