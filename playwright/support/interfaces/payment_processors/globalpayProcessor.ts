import { BaseProcessor } from './baseProcessor';

interface GlobalpayProcessor extends BaseProcessor {
  private_api_key: string;
  external_merchant_id: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  currency_iso3?: string;
  country_iso?: string;
}

const globalpayProcessor: GlobalpayProcessor = {
  name: 'globalpay',
  payment_processor_id: 78,
  enabled: true,
  currency_iso3: 'COP',
  country_iso: 'CO',
  private_api_key: 'syIGM7iXBJzxgNnwDMRcqHI3TwRY5d',
  external_merchant_id: 'DEUNA-STG-GLP',
  allow_installments: true,
  enable_3ds_authentication: false,
  flow: 'direct',
  flow_version: 'workflow',
  three_ds_internal_version: '2.0',
};

const globalpayProcessorWith3ds: GlobalpayProcessor = {
  name: 'globalpay',
  payment_processor_id: 78,
  enabled: true,
  currency_iso3: 'COP',
  private_api_key: 'syIGM7iXBJzxgNnwDMRcqHI3TwRY5d',
  external_merchant_id: 'DEUNA-STG-GLP',
  allow_installments: true,
  enable_3ds_authentication: true,
  country_iso: 'CO',
};

const globalpayProcessorMx: GlobalpayProcessor = {
  ...globalpayProcessor,
  currency_iso3: 'MXN',
  country_iso: 'MX'
}

export { globalpayProcessor, globalpayProcessorWith3ds, globalpayProcessorMx };
