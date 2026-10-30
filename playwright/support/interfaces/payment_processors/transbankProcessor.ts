import { BaseProcessor } from './baseProcessor';

interface TransbankProcessor extends BaseProcessor {
  external_merchant_id: string;
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  countries_excluded_from_id_validation?: string[];
  extra_params?: { [key: string]: string | boolean };
  flow: string;
  flow_version: string;
}

const transbankProcessor: TransbankProcessor = {
  name: 'transbank',
  payment_processor_id: 52,
  enabled: true,
  currency_iso3: 'CLP',
  external_merchant_id: '597055555531',
  private_api_key: '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C',
  allow_installments: true,
  enable_3ds_authentication: false,
  automatic_capture: true,
  countries_excluded_from_id_validation: ['ALL'],
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  country_iso: 'CL',
};

const transbankProcessorAuthorize: TransbankProcessor = {
  ...transbankProcessor,
  automatic_capture: false,
};

const transbankProcessorMallAuthorize: TransbankProcessor = {
  ...transbankProcessor,
  automatic_capture: false,
  external_merchant_id: '597055555576',
  extra_params: {
    store: "597055555577"
  },
};

const transbankProcessorMallPurchase: TransbankProcessor = {
  ...transbankProcessor,
  external_merchant_id: '597055555576',
  automatic_capture: true,
  extra_params: {
    store: "597055555577"
  },
};

const transbankProcessorAutoCapture: TransbankProcessor = {
  ...transbankProcessorMallPurchase,
  automatic_capture: true,
};

// See https://www.transbankdevelopers.cl/documentacion/como_empezar#codigos-de-comercio
const transbankProcessorRefund: TransbankProcessor = {
  ...transbankProcessor,
  external_merchant_id: '597055555530',
};

export {
  transbankProcessor,
  transbankProcessorAuthorize,
  transbankProcessorRefund,
  transbankProcessorMallAuthorize,
  transbankProcessorMallPurchase,
  transbankProcessorAutoCapture,
};
