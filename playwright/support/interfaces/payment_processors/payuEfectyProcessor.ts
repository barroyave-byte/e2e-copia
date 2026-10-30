import { BaseProcessor } from '@support/interfaces/payment_processors/baseProcessor';

interface PayuEfectyProcessor extends BaseProcessor {
  country_iso: string;
  flow?: string;
  flow_version?: string;
}

const payuEfectyProcessor: PayuEfectyProcessor = {
  name: 'PAYU_EFECTY',
  payment_processor_id: 58,
  enabled: true,
  currency_iso3: 'COP',
  external_merchant_id: '511620',
  private_api_key: 'bjuSxu382vh5d5GjxpRu409wQ2',
  public_api_key: 'jI5ZhgfpWpVoM15',
  automatic_capture: true,
  country_iso: 'CO',
  flow: 'payconnect',
  extra_params: {
    account_id: '516553',
  },
};

const payuEfectyProcessorPayconnect: PayuEfectyProcessor = {
  ...payuEfectyProcessor,
  flow: 'payconnect',
};

export { payuEfectyProcessor, payuEfectyProcessorPayconnect };
