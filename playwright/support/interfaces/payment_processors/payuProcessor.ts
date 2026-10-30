import { BaseProcessor } from './baseProcessor';

interface PayUProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  external_merchant_id: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  extra_params?: { account_id: string };
  automatic_capture?: boolean;
  country_iso?: string;
}

const payUProcessor: PayUProcessor = {
  name: 'payu_credit',
  payment_processor_id: 57,
  enabled: true,
  currency_iso3: 'MXN',
  public_api_key: 'pRRXKOl8ikMmt9u',
  private_api_key: '4Vj8eK4rloUd272L48hsrarnUA',
  external_merchant_id: '508029',
  allow_installments: true,
  enable_3ds_authentication: false,
  extra_params: {
    account_id: '512324',
  },
};

const payUColombiaProcessor: PayUProcessor = {
  name: 'payu_co',
  payment_processor_id: 57,
  enabled: true,
  currency_iso3: 'COP',
  country_iso: 'CO',
  public_api_key: 'pRRXKOl8ikMmt9u',
  private_api_key: '4Vj8eK4rloUd272L48hsrarnUA',
  external_merchant_id: '508029',
  allow_installments: false,
  enable_3ds_authentication: false,
  extra_params: {
    account_id: '512321',
  },
};

const payUProcessorAuthorize: PayUProcessor = {
  ...payUProcessor,
  automatic_capture: false,
  country_iso: 'MX',
};

export { payUProcessor, payUProcessorAuthorize, payUColombiaProcessor };
