import { BaseProcessor } from './baseProcessor';

interface NuveiProcessor extends BaseProcessor {
  identification_type: string;
  public_api_key: string;
  private_api_key: string;
  external_merchant_id?: string;
}

const nuveiOxxoProcessor: NuveiProcessor = {
  name: 'nuvei_oxxo',
  payment_processor_id: 61,
  enabled: true,
  currency_iso3: 'MXN',
  identification_type: 'RUT',
  public_api_key: '241668',
  private_api_key: 'ys0DanXRl6LqIpQit4XrtK81RmtFfiJp2KLJPMHM5kXcHQEXpLSc56sboQKKwNOY',
  external_merchant_id: '8497895954792724587',
};

export { nuveiOxxoProcessor };
