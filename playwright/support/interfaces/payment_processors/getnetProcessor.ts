import { BaseProcessor } from './baseProcessor';

interface GetnetProcessor extends BaseProcessor {
  private_api_key: string;
  public_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture: boolean;
  country_iso?: string;
  flow: string;
  flow_version: string;
}

const getnetProcessor: GetnetProcessor = {
  name: 'getnet',
  payment_processor_id: 81,
  enabled: true,
  automatic_capture: true,
  currency_iso3: 'BRL',
  private_api_key: 'b59f3a57-35d2-4ecc-9bb8-c3c68d9bdbb5',
  public_api_key: 'cid_d853cda7-3acd-4ec2-a292-6912c900b7a6',
  allow_installments: true,
  enable_3ds_authentication: false,
  country_iso: 'BR',
  flow:"payconnect",
  flow_version:"multi_step_workflow"
};

const getnetProcessorMx: GetnetProcessor = {
  name: 'getnet',
  payment_processor_id: 81,
  enabled: true,
  currency_iso3: 'MXN',
  automatic_capture: true,
  private_api_key: 'b59f3a57-35d2-4ecc-9bb8-c3c68d9bdbb5',
  public_api_key: 'cid_d853cda7-3acd-4ec2-a292-6912c900b7a6',
  allow_installments: true,
  enable_3ds_authentication: false,
  country_iso: 'MX',
  flow:"payconnect",
  flow_version:"multi_step_workflow"
};

const getnetProcessorAuthorize: GetnetProcessor = {
  ...getnetProcessor,
  automatic_capture: false,
};

export {
  getnetProcessor,
  getnetProcessorMx,
  getnetProcessorAuthorize
};
