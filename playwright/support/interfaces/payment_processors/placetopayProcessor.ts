import { BaseProcessor } from './baseProcessor';

interface PlaceToPayProcessor extends BaseProcessor {
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  external_merchant_id: string;
  automatic_capture?: boolean;
  country_iso?: string;
}

const placeToPayProcessor: PlaceToPayProcessor = {
  name: 'placetopay',
  payment_processor_id: 35,
  enabled: true,
  currency_iso3: 'COP',
  private_api_key: 'iQhxZqnRbJe',
  external_merchant_id: '6dd490faf9cb87a9862245da41170ff2',
  allow_installments: true,
  enable_3ds_authentication: false,
  country_iso: 'CO',
};

const placeToPay3dsProcessor: PlaceToPayProcessor = {
  ...placeToPayProcessor,
  enable_3ds_authentication: true,
};

const placeToPayProcessorAuthorize: PlaceToPayProcessor = {
  ...placeToPayProcessor,
  automatic_capture: false,
  currency_iso3: 'CLP',
  country_iso: 'CL',
};

const placetopayProcessorForVisa: PlaceToPayProcessor = {
  ...placeToPayProcessor,
  private_api_key: 'avHhSgU033zdPygA',
  external_merchant_id: '1f10279320e8714f7a16c08bcfb0ab71',
};

export {
  placeToPayProcessor,
  placeToPay3dsProcessor,
  placeToPayProcessorAuthorize,
  placetopayProcessorForVisa,
};
