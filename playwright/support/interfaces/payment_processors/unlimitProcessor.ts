import { BaseProcessor } from './baseProcessor';

const unlimitProcessorID = 75;

interface UnlimitProcessor extends BaseProcessor {
  external_merchant_id: string;
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  extra_params: { [key: string]: string };
  flow?: string;
  three_ds_processing_provider?: string;
  three_ds_specific_fields?: { [key: string]: string };
}

const unlimitProcessor: UnlimitProcessor = {
  name: 'unlimit',
  payment_processor_id: 75,
  enabled: true,
  currency_iso3: 'MXN',
  external_merchant_id: '58391',
  private_api_key: 'Exc1ArNUv523',
  allow_installments: true,
  enable_3ds_authentication: false,
  country_iso: 'MX',
  extra_params: {
    processorId: '1',
  },
};

const unlimitAuthorizeProcessor: UnlimitProcessor = {
  ...unlimitProcessor,
  automatic_capture: false,
};

const unlimitProcessorPayconnect: UnlimitProcessor = {
  ...unlimitProcessor,
  name: 'unlimit payconnect',
  flow: 'payconnect',
};

const unlimitProcessorPayconnectWithThreeDS: UnlimitProcessor = {
  ...unlimitProcessorPayconnect,
  name: 'unlimit payconnect 3ds',
  enable_3ds_authentication: true,
};

const unlimitAuthorizeProcessorPayconnect: UnlimitProcessor = {
  ...unlimitProcessor,
  flow: 'payconnect',
  automatic_capture: false,
};

const unlimitProcessorWithDEUNAThreeDS: UnlimitProcessor = {
  ...unlimitProcessor,
  flow: 'payconnect',
  enable_3ds_authentication: true,
  extra_params: {
    merchant_name: 'DEUNA',
    merchant_url: 'https://www.deuna.com/',
    merchant_category_code: '5691', // Men's and Women's Clothing Stores
    merchant_acquirer_id: '123456789300205',
    merchant_country: 'MX',
  },
  three_ds_processing_provider: 'deuna',
  three_ds_specific_fields: {
    acquirer_merchant_id: '123456789300205',
  },
};

const unlimitAuthorizeProcessorWithDEUNAThreeDS: UnlimitProcessor = {
  ...unlimitProcessorWithDEUNAThreeDS,
  automatic_capture: false,
};

export {
  unlimitProcessor,
  unlimitAuthorizeProcessor,
  unlimitProcessorPayconnect,
  unlimitAuthorizeProcessorPayconnect,
  unlimitProcessorPayconnectWithThreeDS,
  unlimitProcessorWithDEUNAThreeDS,
  unlimitAuthorizeProcessorWithDEUNAThreeDS,
  unlimitProcessorID,
};
