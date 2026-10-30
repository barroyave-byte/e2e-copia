import { BaseProcessor } from './baseProcessor';

const cashProcessor: BaseProcessor = {
  name: 'cash',
  payment_processor_id: 7,
  enabled: true,
  currency_iso3: 'MXN',
};

const cashProcessorEC: BaseProcessor = {
  name: 'cash',
  payment_processor_id: 7,
  enabled: true,
  currency_iso3: 'USD',
};

export { cashProcessor, cashProcessorEC };
