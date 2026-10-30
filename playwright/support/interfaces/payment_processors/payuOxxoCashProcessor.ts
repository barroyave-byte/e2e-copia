import { BaseProcessor } from './baseProcessor';

export interface PayuOxxoCashProcessor extends BaseProcessor {
  country_iso: string;
  flow?: string;
  flow_version?: string;
  extra_params: { account_id: string };
}

const payuOxxoCashProcessor: PayuOxxoCashProcessor = {
  name: 'PAYU_OXXO_CASH',
  payment_processor_id: 96,
  enabled: true,
  currency_iso3: 'MXN',
  external_merchant_id: '511620',
  private_api_key: 'bjuSxu382vh5d5GjxpRu409wQ2',
  public_api_key: 'jI5ZhgfpWpVoM15',
  automatic_capture: true,
  country_iso: 'MX',
  flow_version: 'workflow',
  extra_params: {
    account_id: '516561',
  },
  flow: 'payconnect',
};

const payuOxxoCashProcessorPayconnect: PayuOxxoCashProcessor = {
  ...payuOxxoCashProcessor,
  flow: 'payconnect',
};

export { payuOxxoCashProcessor, payuOxxoCashProcessorPayconnect };
