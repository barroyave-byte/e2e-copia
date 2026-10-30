import { BaseProcessor } from './baseProcessor';

interface AdyenProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
}

const adyenProcessor: AdyenProcessor = {
  name: 'Adyen',
  payment_processor_id: 41,
  enabled: true,
  extra_params: {
    prefix: '',
  },
  external_merchant_id: 'DEUNAAccount_Payconnect_TEST',
  currency_iso3: 'MXN',
  public_api_key: 'MexicoCOM',
  private_api_key:
    'AQEuhmfxK4/IYxRGw0m/n3Q5qf3VbK54I7JrW2ZZ03a/l3WjyDhTa2BMYD3vXKY5fxDBXVsNvuR83LVYjEgiTGAH-0YwliR9EqrKuaiPmlOe6+UDpydB+P68PekQe4xPx13Q=-i1iC2@D;C]V)pf>I^bc',
  allow_installments: true,
  enable_3ds_authentication: false,
};

const adyenProcessorAuthorize: AdyenProcessor = {
  ...adyenProcessor,
  automatic_capture: false,
  country_iso: "MX"
};

export { adyenProcessor, adyenProcessorAuthorize };
