import { BaseProcessor } from './baseProcessor';

export interface BizumPushProcessor extends BaseProcessor {}

export const bizumPushProcessor: BizumPushProcessor = {
  name: 'bizum_push',
  payment_processor_id: 155,
  enabled: true,
  country_iso: 'ES',
  currency_iso3: 'EUR',
  external_merchant_id: '263100000',
  private_api_key: 'sq7HjrUOBfKmC576ILgskD5srU870gJ7',
  automatic_capture: true,
  extra_params: {
    merchant_terminal: '9',
  },
};
