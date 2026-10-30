import { BaseProcessor } from './baseProcessor';

export interface KlapProcessor extends BaseProcessor {
  allow_installments: boolean;
}

const klapProcessor = {
  allow_installments: false,
  country_iso: 'CL',
  currency_iso3: 'CLP',
  enabled: true,
};

export const klapSodexoProcessor: KlapProcessor = {
  ...klapProcessor,
  name: 'Klap Sodexo',
  payment_processor_id: 102,
  private_api_key: 'f592812fc7a94f56b0c57396c52bf812',
};

export const klapEdenredProcessor: KlapProcessor = {
  ...klapProcessor,
  name: 'Klap Edenred',
  payment_processor_id: 103,
  private_api_key: 'ce41c61c0ab546b1b1e8e4c1208f53aa',
};
