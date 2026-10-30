import { BaseProcessor } from './baseProcessor';

const posProcessor: BaseProcessor = {
  name: 'POS',
  payment_processor_id: 8,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
};

export { posProcessor };
