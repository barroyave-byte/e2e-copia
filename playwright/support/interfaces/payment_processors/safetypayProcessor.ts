import { BaseProcessor } from './baseProcessor';

export interface SafetypayProcessor extends BaseProcessor {
  allow_installments: boolean;
  mode_of_integration: string;
  extra_params: {
    signature_key: string;
    express_checkout: boolean;
    forex: 'direct_forex' | 'reverse_forex';
    forex_currency: string;
    expiration_time_minutes: number;
    channel_filter: 'WP' | 'OL';
  };
}

const safetypayProcessor: SafetypayProcessor = {
  name: 'Safetypay Direct',
  currency_iso3: 'USD',
  private_api_key: '064520298754c5391f55a7ca5eaa5b67',
  extra_params: {
    signature_key: '86a9fcd0306424a9688d92b96c9714c8',
    express_checkout: true,
    forex: 'direct_forex',
    forex_currency: 'MXN',
    expiration_time_minutes: 60,
    channel_filter: 'WP',
  },
  country_iso: 'MX',
  payment_processor_id: 107,
  enabled: true,
  allow_installments: true,
  mode_of_integration: 'direct',
};

export { safetypayProcessor };
