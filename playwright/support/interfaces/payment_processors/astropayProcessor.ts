import { BaseProcessor } from './baseProcessor';

interface AtropayProcessor extends BaseProcessor {
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  external_merchant_id: string;
  automatic_capture?: boolean;
  country_iso?: string;
  settlement_enable?: boolean;
}

const astropayProcessorAR: AtropayProcessor = {
  name: 'astropay',
  payment_processor_id: 147,
  enabled: true,
  currency_iso3: 'ARS',
  country_iso: 'AR',
  automatic_capture: true,
  external_merchant_id: '',
  public_api_key: 'Vj0a3Y4c1BzD6Kep8X2oa97z0g247fXT',
  private_api_key: 'yY5QvW89HrKJlvJAaNx2g2pmGiDtN2Js',
  acquirer_id: '',
  merchant_pwd: '',
  allow_installments: false,
  enable_3ds_authentication: false,
  settlement_enable: false,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
};

export { astropayProcessorAR };
