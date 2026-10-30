import { BaseProcessor } from './baseProcessor';

interface NiubizExtraParams {
  url: string;
  username: string;
  password: string;
  merchantCode: string;
}

interface NiubizProcessor extends BaseProcessor {
  allow_installments: boolean;
  external_merchant_id: string;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  extra_params?: NiubizExtraParams;
}

const niubizProcessor: NiubizProcessor = {
  name: 'niubiz',
  payment_processor_id: 119,
  enabled: true,
  currency_iso3: 'PEN',
  allow_installments: true,
  enable_3ds_authentication: false,
  country_iso: 'PE',
  external_merchant_id:'456879852',
  extra_params: {
    url: "https://sky.com.pe",
    password: "_7z3@8fF",
    username: "integraciones@niubiz.com.pe",
    merchantCode: "23545454545"
  },
  automatic_capture: true,
};

const niubizProcessorAuthorize: NiubizProcessor = {
  ...niubizProcessor,
  automatic_capture: false,
};

export { niubizProcessor, niubizProcessorAuthorize };
