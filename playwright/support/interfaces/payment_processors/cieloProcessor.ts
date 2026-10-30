import { BaseProcessor } from './baseProcessor';

interface CieloProcessor extends BaseProcessor {
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  external_merchant_id: string;
  country_iso: string;
  automatic_capture?: boolean;
}

const cieloProcessor: CieloProcessor = {
  name: 'cielo',
  payment_processor_id: 74,
  enabled: true,
  currency_iso3: 'BRL',
  external_merchant_id: '40c5bed8-49d2-471c-a990-6f99631adc1b',
  private_api_key: 'HCGHFHZEULXQBTLAUAMBVEPWYDHFLGKAXERYUKIG',
  allow_installments: true,
  enable_3ds_authentication: false,
  country_iso: 'BR',
};

const cielo3dsProcessor: CieloProcessor = {
  ...cieloProcessor,
  enable_3ds_authentication: true,
};

const cieloAuthorize: CieloProcessor = {
  ...cieloProcessor,
  automatic_capture: false,
};

export { cieloProcessor, cielo3dsProcessor, cieloAuthorize };
