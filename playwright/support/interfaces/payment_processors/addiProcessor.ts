import { BaseProcessor } from './baseProcessor';

interface AddiProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  flow: string;
  flow_version: string;
}

const addiProcessor: AddiProcessor = {
  name: 'addi',
  payment_processor_id: 20,
  enabled: true,
  currency_iso3: 'COP',
  public_api_key: 'wTi8TPd7XgKKlVOU67iEoZtqKFbs8NK8',
  private_api_key: 'h1BX3FweULBGjeLuzl_xTS3B8DGEPqP9Y3Qv9AkcTz980fzm26f4bKPsnlRiuZy4',
  automatic_capture: true,
  allow_installments: false,
  enable_3ds_authentication: false,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
};

export { addiProcessor };
