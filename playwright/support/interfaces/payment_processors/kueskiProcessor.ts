import { BaseProcessor } from './baseProcessor';
import envConfig from '@support/envConfig';

const getApiKeys = () => {
    return {
      public_api_key: '0b3710a0-3df6-41f2-a5ab-a8ca8d2ca4c7',
      private_api_key: '8eabb404-dd02-4ea1-bfdd-0ce3e4e85c9e',
    };
};

interface KueskiProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  automatic_capture?: boolean;
  country_iso: string;
}
const kueskiProcessor: KueskiProcessor = {
  name: 'kueski',
  payment_processor_id: 12,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  ...getApiKeys(),
};

export { kueskiProcessor };
