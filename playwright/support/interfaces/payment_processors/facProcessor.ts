import { BaseProcessor } from './baseProcessor';

interface FacProcessor extends BaseProcessor {
  external_merchant_id: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  acquirer_id: string;
  merchant_pwd: string;
}

const facProcessor: FacProcessor = {
  name: 'fac',
  payment_processor_id: 1,
  enabled: true,
  currency_iso3: 'CRC',
  external_merchant_id: '88805675',
  merchant_pwd: '7IKZ27aT',
  acquirer_id: '464748',
  allow_installments: true,
  enable_3ds_authentication: false,
};

export { facProcessor };
