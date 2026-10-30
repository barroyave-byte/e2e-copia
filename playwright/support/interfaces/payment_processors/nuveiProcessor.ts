import { BaseProcessor } from './baseProcessor';

interface NuveiProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  external_merchant_id?: string,
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
}

const nuveiProcessor: NuveiProcessor = {
  name: 'nuvei',
  payment_processor_id: 54,
  enabled: true,
  currency_iso3: 'MXN',
  public_api_key: '241668',
  private_api_key: 'ys0DanXRl6LqIpQit4XrtK81RmtFfiJp2KLJPMHM5kXcHQEXpLSc56sboQKKwNOY',
  external_merchant_id: '8497895954792724587',
  allow_installments: true,
  enable_3ds_authentication: false
};

const nuvei3dsProcessor: NuveiProcessor = {
  ...nuveiProcessor,
  enable_3ds_authentication: true
};

const nuveiProcessorAuthorize: NuveiProcessor = {
  ...nuveiProcessor,
  automatic_capture: false,
  country_iso: "MX"
};

export { nuveiProcessor, nuvei3dsProcessor, nuveiProcessorAuthorize };
