import { BaseProcessor } from './baseProcessor';

interface RedsysProcessor extends BaseProcessor {
  allow_installments: boolean;
  flow: string;
  flow_version: string;
  enable_3ds_authentication: boolean;
  three_ds_internal_version: string;
}

const redsysProcessor: RedsysProcessor = {
  name: 'redsys',
  payment_processor_id: 94,
  enabled: true,
  currency_iso3: 'EUR',
  external_merchant_id: '358645380',
  private_api_key: 'sq7HjrUOBfKmC576ILgskD5srU870gJ7',
  automatic_capture: true,
  allow_installments: true,
  country_iso: 'ES',
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  enable_3ds_authentication: true,
  three_ds_internal_version: 'v1',
  extra_params: {
    merchant_terminal: '1',
  },
};

const redsysProcessorWith3DS: RedsysProcessor = {
  ...redsysProcessor,
  enable_3ds_authentication: true,
  three_ds_internal_version: 'v1',
};

const redsysAuthorizeProcessor: RedsysProcessor = {
  ...redsysProcessor,
  external_merchant_id: '999008881', // From Redsys' generic credentials, where (pre)auth is possible
  automatic_capture: false,
};

export { redsysProcessor, redsysAuthorizeProcessor, redsysProcessorWith3DS };
