import { BaseProcessor } from './baseProcessor';

interface PagarmeProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
}

const pagarmeProcessor: PagarmeProcessor = {
  name: 'pagarme',
  payment_processor_id: 68,
  enabled: true,
  currency_iso3: 'BRL',
  public_api_key: 'pk_test_vqVgRaPFK0fQa9an',
  private_api_key: 'sk_test_2VkedZeTbTBko6N0',
  allow_installments: true,
  enable_3ds_authentication: false,
};

const pagarme3dsProcessor: PagarmeProcessor = {
  ...pagarmeProcessor,
  enable_3ds_authentication: true,
};

const pagarmeAuthorizeProcessor: PagarmeProcessor = {
  ...pagarmeProcessor,
  automatic_capture: false,
  country_iso: 'BR',
};

const pagarmeMSIProcessor: PagarmeProcessor = {
  ...pagarmeProcessor,
  enable_3ds_authentication: true,
};

export { pagarmeProcessor, pagarme3dsProcessor, pagarmeMSIProcessor, pagarmeAuthorizeProcessor };
