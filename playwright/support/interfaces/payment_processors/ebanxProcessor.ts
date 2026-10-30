import { BaseProcessor } from './baseProcessor';

export interface EbanxProcessor extends BaseProcessor {
  private_api_key: string;
  public_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
}

const ebanxProcessor: EbanxProcessor = {
  name: 'ebanx',
  payment_processor_id: 80,
  enabled: true,
  currency_iso3: 'USD',
  private_api_key: 'test_ik_L9l0hOg-Qg7xScUGw-QLAA',
  public_api_key: 'test_pk_AAK0Nzo8Vcp6yuRwYuDu7A',
  allow_installments: true,
  enable_3ds_authentication: false,
  country_iso: 'PE',
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
};

const ebanxAuthorizeProcessor: EbanxProcessor = {
  ...ebanxProcessor,
  automatic_capture: false,
};

const ebanxWith3DSProcessor: EbanxProcessor = {
  ...ebanxProcessor,
  name: 'ebanxWith3DS',
  enable_3ds_authentication: true,
  extra_params: {
    merchant_name: 'DEUNA',
    merchant_url: 'https://www.deuna.com/',
    merchant_category_code: '5691',
    merchant_acquirer_id: '123456',
    merchant_country: 'MX',
    visa_acquirer_bin: '451298',
    mastercard_acquirer_bin: '543499',
    amex_acquirer_bin: '123456',
    diners_discover_acquirer_bin: '123456',
  },
  three_ds_processing_provider: 'deuna',
  three_ds_specific_fields: {
    acquirer_merchant_id: '123456',
  },
};

function createEbanxProcessor(
  country_iso: string,
  setAutomaticCapture: boolean = false,
  force_currency_code?: string,
): EbanxProcessor {
  const processor: EbanxProcessor = {
    ...ebanxProcessor,
    country_iso: country_iso,
  };

  if (setAutomaticCapture) {
    processor.automatic_capture = false;
  }
  if (force_currency_code) {
    processor.currency_iso3 = force_currency_code;
  }

  return processor;
}

export { ebanxProcessor, createEbanxProcessor, ebanxAuthorizeProcessor, ebanxWith3DSProcessor };
