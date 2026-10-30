import { BaseProcessor } from './baseProcessor';

interface PagbankProcessor extends BaseProcessor {
  public_api_key?: string;
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  countries_excluded_from_id_validation: string[];
  flow: string;
  workflow_version: string;
  identification_type: string;
}

const pagbankProcessor: PagbankProcessor = {
  name: 'pagbank',
  payment_processor_id: 87,
  enabled: true,
  currency_iso3: 'BRL',
  country_iso: 'BR',
  private_api_key: 'E7D6592B8D364EBF94A95F24E338B42A',
  allow_installments: true,
  automatic_capture: true,
  enable_3ds_authentication: false,
  countries_excluded_from_id_validation: ['ALL'],
  flow: 'payconnect',
  workflow_version: 'workflow',
  identification_type: 'CPF',
};

const pagbankAuthorizeProcessor: PagbankProcessor = {
  ...pagbankProcessor,
  automatic_capture: false,
};

export { pagbankProcessor, pagbankAuthorizeProcessor };
