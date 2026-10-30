import { BaseProcessor } from './baseProcessor';

export interface NequiPushprocessor extends BaseProcessor {
  identification_type: string;
  extra_params: { code_nit: string };
}

export const nequiPushProcessor: NequiPushprocessor = {
  name: 'NEQUI_PUSH_VOUCHER',
  payment_processor_id: 36,
  enabled: true,
  currency_iso3: 'COP',
  country_iso: 'CO',
  identification_type: 'CC',
  external_merchant_id: '7j4k5iqsu495lcid0upeqihmmr',
  merchant_pwd: '18cd6lp11kub3h5fuslko2g9jdn75h9qet8st4jes8n762fcu1j8',
  public_api_key: 'gw1AZc6lRZ9FvocvGIfxi4Pwxu0SOcL2MseG3Dd7',
  extra_params: {
    code_nit: 'NIT_901110407_00',
  },
};
