import { BaseProcessor } from './baseProcessor';

export interface CybersourceProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  external_merchant_id: string;
  acquirer_configuration: string;
  automatic_capture?: boolean;
  country_iso?: string;
}

const baseConfig: CybersourceProcessor = {
  name: 'cybersource',
  payment_processor_id: 45,
  enabled: true,
  currency_iso3: 'BRL',
  public_api_key: '24897aa2-17c2-4fb8-8669-35d58eccc319',
  private_api_key: 'zONfDkwfKoimULxrkiRS2WK453x+fizG7iJYHPDsX+s=',
  external_merchant_id: 'deuna_mx',
  acquirer_configuration: 'Prosa',
  allow_installments: true,
  enable_3ds_authentication: false,
  country_iso: 'BR',
};

const cybersourceProcessor_BR: CybersourceProcessor = {
  ...baseConfig,
  country_iso: 'BR',
  currency_iso3: 'BRL',
};

const cybersourceProcessor_PE: CybersourceProcessor = {
  ...baseConfig,
  country_iso: 'PE',
  currency_iso3: 'PEN',
  enable_3ds_authentication: true,
};

const cybersourceProcessor_PE_Deuna3DS: CybersourceProcessor = {
  ...baseConfig,
  country_iso: 'PE',
  currency_iso3: 'PEN',
  enable_3ds_authentication: true,
  three_ds_processing_provider: 'deuna',
  three_ds_specific_fields: {
    acquirer_merchant_id: '123456',
  },
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
};

const cybersourceProcessorAuthorize_BR: CybersourceProcessor = {
  ...baseConfig,
  automatic_capture: false,
  country_iso: 'BR',
  currency_iso3: 'BRL',
};

const cybersourceProcessorAuthorize_PE: CybersourceProcessor = {
  ...baseConfig,
  automatic_capture: false,
  country_iso: 'PE',
  currency_iso3: 'PEN',
};

const cybersourceProcessorAuthorize_US: CybersourceProcessor = {
  ...baseConfig,
  automatic_capture: false,
  country_iso: 'US',
  currency_iso3: 'USD',
};

const cybersourceProcessor_US: CybersourceProcessor = {
  ...baseConfig,
  automatic_capture: true,
  country_iso: 'US',
  currency_iso3: 'USD',
};

export {
  cybersourceProcessor_BR,
  cybersourceProcessor_PE,
  cybersourceProcessorAuthorize_BR,
  cybersourceProcessorAuthorize_PE,
  cybersourceProcessor_PE_Deuna3DS,
  cybersourceProcessorAuthorize_US,
  cybersourceProcessor_US,
};
