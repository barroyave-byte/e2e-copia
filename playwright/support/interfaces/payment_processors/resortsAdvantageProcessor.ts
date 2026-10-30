import { BaseProcessor } from './baseProcessor';

interface ResortsAdvantageProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  automatic_capture?: boolean;
  country_iso?: string;
}

const resortsAdvantageProcessor: ResortsAdvantageProcessor = {
  name: 'RESORTS_ADVANTAGE',
  payment_processor_id: 113,
  enabled: true,
  currency_iso3: 'USD',
  external_merchant_id: 'DEUNATEST',
  private_api_key: 'vinacrAdRlBl1ruyEthahutraTRexInedlrexLs1opanLCHAfewrogiracIFrAha',
  public_api_key: 'RoyalDeUna',
  automatic_capture: true,
  country_iso: 'US',
  flow: 'payconnect',
  extra_params: {
    user_code: 'RHDeUnaAPI',
  },
};

export { resortsAdvantageProcessor };
