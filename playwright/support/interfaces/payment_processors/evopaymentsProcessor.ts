import { BaseProcessor } from './baseProcessor';

interface EvopaymentsProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
}

const evopaymentsProcessor: EvopaymentsProcessor = {
  name: 'evopayments',
  payment_processor_id: 48,
  enabled: true,
  currency_iso3: 'MXN',
  public_api_key: 'TEST1164963',
  private_api_key: 'f3d540ec4454da0995395d6b0990c9da',
  allow_installments: true,
  enable_3ds_authentication: false
};

const evopayments3dsProcessor: EvopaymentsProcessor = {
  ...evopaymentsProcessor,
  enable_3ds_authentication: true
};

export { evopaymentsProcessor, evopayments3dsProcessor };
