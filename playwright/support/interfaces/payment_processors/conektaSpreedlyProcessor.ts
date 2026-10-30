import { BaseProcessor } from './baseProcessor';

interface ConektaSpreedlyProcessor extends BaseProcessor {
  allow_installments: boolean;
  conekta: { api_key: string };
}

const conektaSpreedlyProcessor: ConektaSpreedlyProcessor = {
  name: 'conekta',
  payment_processor_id: 11,
  enabled: true,
  currency_iso3: 'MXN',
  conekta: { api_key: 'key_CzTYpBTBDQRQYvQiyoobpQ' },
  allow_installments: true,
};

export { conektaSpreedlyProcessor };
