import { BaseProcessor } from './baseProcessor';

interface MitProcessor extends BaseProcessor {
  currency_iso3: string;
  country_iso: string;
  automatic_capture: boolean;
  external_merchant_id: string;
  public_api_key: string;
  private_api_key: string;
  acquirer_id: string;
  merchant_pwd: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  extra_params: ExtraParams;
  use_static_proxy: boolean;
}

interface ExtraParams {
  data0: string;
  country: string;
  vmc_contado: string;
  vmc_3_msi: string;
  vmc_6_msi: string;
  vmc_9_msi: string;
  amex_contado: string;
  amex_3_msi: string;
  amex_6_msi: string;
  amex_9_msi: string;
}

const mitProcessor: MitProcessor = {
  name: 'mit',
  payment_processor_id: 85,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  automatic_capture: true,
  external_merchant_id: 'Z703',
  public_api_key: 'Z703IDUS1',
  private_api_key: 'BHPH9C4TTQ',
  acquirer_id: '01011130',
  merchant_pwd: 'A2832DE3C0B2289253D4B383404E8C1C',
  allow_installments: false,
  enable_3ds_authentication: false,
  use_static_proxy: true,
  extra_params: {
    data0: '9265654606',
    country: 'MEX',
    vmc_contado: '158198',
    vmc_3_msi: '158199',
    vmc_6_msi: '158200',
    vmc_9_msi: '158201',
    amex_contado: '158202',
    amex_3_msi: '158203',
    amex_6_msi: '158204',
    amex_9_msi: '158205',
  },
};

const mitProcessor3DS: MitProcessor = {
  ...mitProcessor,
  enable_3ds_authentication: true,
};

export { mitProcessor, mitProcessor3DS };
