import { BaseProcessor } from './baseProcessor';

interface CredibancoProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  flow?: string;
  flow_version?: string;
}

const credibancoProcessor: CredibancoProcessor = {
  name: 'credibanco',
  payment_processor_id: 97,
  enabled: true,
  currency_iso3: 'COP',
  public_api_key: 'DACASIGNAVNP61-api',
  private_api_key: 'DACASIGNAVNP61-api',
  allow_installments: true,
  enable_3ds_authentication: true,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
};

export { credibancoProcessor };
