import { BaseProcessor } from './baseProcessor';

interface ExpirationTimes {
  pending: number;
}

interface AsaasPixProcessor extends Omit<
  BaseProcessor,
  'enable_3ds_authentication' | 'flow' | 'flow_version'
> {
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  flow: string;
  flow_version: string;
  expiration_times?: ExpirationTimes;
}

export const asaasPixProcessor: AsaasPixProcessor = {
  name: 'asaas_pix',
  payment_processor_id: 88,
  enabled: true,
  currency_iso3: 'BRL',
  country_iso: 'BR',
  automatic_capture: true,
  public_api_key: '89bd5e4e-2393-4bd1-b973-2010c3169ea2',
  private_api_key:
    '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojk5MTllMzI3LWEwZmYtNGU1ZS04ZmM4LWMzOTBlMTFkNTc0Zjo6JGFhY2hfMzM4ZjRlM2ItY2RiMi00OWYyLWJmYzgtM2ZjYjkxZjE5NDBj',
  enable_3ds_authentication: false,
  allow_installments: false,
  flow: 'payconnect',
  flow_version: 'workflow',
  expiration_times: {
    pending: 2,
  },
};
