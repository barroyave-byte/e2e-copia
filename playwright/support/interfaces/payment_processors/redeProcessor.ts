import { BaseProcessor } from './baseProcessor';

interface RedeProcessor extends BaseProcessor {
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  external_merchant_id: string;
  extra_params: ExtraParams;
  country_iso: string;
  automatic_capture?: boolean;
  three_ds_processing_provider?: string;
  deuna_three_ds_underlying_provider?: string;
  three_ds_specific_fields?: {
    acquirer_merchant_id: string;
  };
  flow?: string;
  flow_version?: string;
}

interface ExtraParams {
  processorId: string;
  merchant_url?: string;
  merchant_name?: string;
  merchant_country?: string;
  amex_acquirer_bin?: string;
  visa_acquirer_bin?: string;
  merchant_category_code?: string;
  mastercard_acquirer_bin?: string;
  diners_discover_acquirer_bin?: string;
}

const redeProcessor: RedeProcessor = {
  name: 'rede',
  payment_processor_id: 72,
  enabled: true,
  currency_iso3: 'BRL',
  external_merchant_id: '71834024',
  private_api_key: 'tg7pl1afq7ktq8k8oedxtjpc',
  allow_installments: true,
  enable_3ds_authentication: false,
  extra_params: {
    processorId: '1',
  },
  country_iso: 'BR',
  merchant_pwd: '7c9465ebb40b4f3a95fd5041bc8701e2',
};

const rede3DSProcessor: RedeProcessor = {
  name: 'REDE_3DS',
  external_merchant_id: '71834024',
  private_api_key: 'tg7pl1afq7ktq8k8oedxtjpc',
  automatic_capture: true,
  enable_3ds_authentication: true,
  three_ds_processing_provider: 'deuna',
  deuna_three_ds_underlying_provider: 'cybersource_3ds',
  three_ds_specific_fields: {
    acquirer_merchant_id: '123456',
  },
  extra_params: {
    processorId: '1',
    merchant_url: 'https://www.deuna.com',
    merchant_name: 'Deuna',
    merchant_country: 'MX',
    amex_acquirer_bin: '123456',
    visa_acquirer_bin: '451298',
    merchant_category_code: '5691',
    mastercard_acquirer_bin: '543499',
    diners_discover_acquirer_bin: '123456',
  },
  country_iso: 'BR',
  payment_processor_id: 72,
  merchant_pwd: '7c9465ebb40b4f3a95fd5041bc8701e2',
  enabled: true,
  currency_iso3: 'BRL',
  allow_installments: false,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
};

const redeAuthorize: RedeProcessor = {
  ...redeProcessor,
  automatic_capture: false,
};

export { redeProcessor, rede3DSProcessor, redeAuthorize };
