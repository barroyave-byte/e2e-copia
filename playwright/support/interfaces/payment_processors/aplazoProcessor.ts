import { BaseProcessor } from '@support/interfaces/payment_processors/baseProcessor';

interface AplazoProcessor extends BaseProcessor {
  country_iso: string;
  flow?: string;
  flow_version?: string;
  allow_installments: boolean;
}

const aplazoProcessor: AplazoProcessor = {
  name: 'aplazo',
  payment_processor_id: 21,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  automatic_capture: true,
  allow_installments: false,
  external_merchant_id: '2567',
  private_api_key: 'd70aee9a-010e-4d0c-ab7b-7f79e44bbd5a',
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
};

const invalidAplazoProcessor: AplazoProcessor = {
  name: 'APLAZO',
  payment_processor_id: 21,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  automatic_capture: true,
  allow_installments: false,
  external_merchant_id: '2567',
  private_api_key: 'd70aee9a-010e-4d0c-ab7b-7f79e44bbd51',
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
};

const AplazoProcessorPayconnect: AplazoProcessor = {
  ...aplazoProcessor,
  flow: 'payconnect',
};

export {
  AplazoProcessor,
  AplazoProcessorPayconnect,
  aplazoProcessor,
  invalidAplazoProcessor,
};
