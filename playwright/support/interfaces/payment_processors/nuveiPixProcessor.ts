import { BaseProcessor } from './baseProcessor';

interface ExpirationTimes {
  pending: number;
}

interface NuveiPixProcessor
  extends Omit<BaseProcessor, 'enable_3ds_authentication' | 'flow' | 'flow_version'> {
  external_merchant_id: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  flow: string;
  flow_version: string;
  expiration_times?: ExpirationTimes;
}

export const nuveiPixProcessor: NuveiPixProcessor = {
  name: 'nuvei_pix',
  payment_processor_id: 172,
  enabled: true,
  currency_iso3: 'BRL',
  country_iso: 'BR',
  automatic_capture: true,
  public_api_key: '241668',
  private_api_key: 'ys0DanXRl6LqIpQit4XrtK81RmtFfiJp2KLJPMHM5kXcHQEXpLSc56sboQKKwNOY',
  enable_3ds_authentication: false,
  external_merchant_id: '8497895954792724587',
  allow_installments: false,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
};

export const nuveiPixProcessorWithMPR: NuveiPixProcessor = {
  ...nuveiPixProcessor,
  multiple_partial_refund: true,
  transaction_config: {
    refund_cutoff_days: 1,
  },
};
