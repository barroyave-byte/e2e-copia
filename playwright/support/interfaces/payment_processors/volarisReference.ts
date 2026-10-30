import { BaseProcessor } from './baseProcessor';

export interface VolarisReferenceProcessor extends BaseProcessor {
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  settlement_enable: boolean;
}

export interface VolarisReferenceOptions {
  currency_iso3?: string;
  extra_params?: Partial<VolarisReferenceProcessor['extra_params']> & {
    safetypay_private_key?: string;
    reference_payment_supported?: string[];
  };
}

const createVolarisReference = (options?: VolarisReferenceOptions): VolarisReferenceProcessor => ({
  name: 'volaris_patito',
  payment_processor_id: 112,
  enabled: true,
  currency_iso3: options?.currency_iso3 ?? 'USD',
  country_iso: 'EC',
  automatic_capture: true,
  external_merchant_id: '290009304',
  private_api_key: '',
  acquirer_id: '01008600998',
  merchant_pwd: '4211VGTT',
  allow_installments: false,
  enable_3ds_authentication: false,
  settlement_enable: true,
  extra_params: {
    safetypay_private_key: '064520298754c5391f55a7ca5eaa5b67',
    countries_supported: ['MX', 'EC', 'CO'],
    reference_payment_supported: ['oxxo_reference', 'baz_reference', 'safetypay_express'],
    ...options?.extra_params,
  },
});

export { createVolarisReference };
