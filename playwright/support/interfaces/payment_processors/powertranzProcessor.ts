import { BaseProcessor } from './baseProcessor';

interface PowertranzProcessor extends BaseProcessor {
  currency_iso3: string;
  country_iso: string;
  automatic_capture: boolean;
  public_api_key: string;
  private_api_key: string;
  enable_3ds_authentication: boolean;
  three_ds_internal_version?: string;
  flow?: string;
  flow_version?: string;
}

const powertranzProcessorHN: PowertranzProcessor = {
  name: 'powertranz',
  payment_processor_id: 106,
  enabled: true,
  currency_iso3: 'HNL',
  country_iso: 'HN',
  automatic_capture: true,
  public_api_key: '77700626',
  private_api_key: 'cMKTnq5jvqKv9CBUsOzEGdRedoYMJNtGRVeFqAL2JjDqgkUCgMz2ZD',
  enable_3ds_authentication: false,
};

const powertranzProcessorAuthorizeHN: PowertranzProcessor = {
  ...powertranzProcessorHN,
  automatic_capture: false,
};

const powertranzProcessor3dsHN: PowertranzProcessor = {
  ...powertranzProcessorHN,
  enable_3ds_authentication: true,
  three_ds_internal_version: 'v1',
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
};

const powertranzProcessor3dsAuthorizeHN: PowertranzProcessor = {
  ...powertranzProcessor3dsHN,
  automatic_capture: false,
};

export {
  powertranzProcessorHN,
  powertranzProcessorAuthorizeHN,
  powertranzProcessor3dsHN,
  powertranzProcessor3dsAuthorizeHN,
};
