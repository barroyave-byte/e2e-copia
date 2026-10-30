import { BaseProcessor } from './baseProcessor';

// These are Fintoc sandbox credentials required to register the processor via the API in tests.
// public_api_key (pk_test_*) is a publishable key — safe to store in source.
// private_api_key (sk_test_*) is a sandbox-only test secret; it grants no access to production data.
const fintocProcessor: BaseProcessor = {
  name: 'fintoc',
  payment_processor_id: 249,
  enabled: true,
  country_iso: 'CL',
  currency_iso3: 'CLP',
  public_api_key: 'pk_test_uvyNM6r4Zz-CnC-bgGa8sWFiViunm9cCWvTrCX1T1GA',
  private_api_key: 'sk_test_pwPRJsLKE_mWgUxactD26j5eVZ8GWweadovPD28JTvg',
};

export { fintocProcessor };
