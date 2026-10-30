import { BaseProcessor } from './baseProcessor';

interface PaypalACDCProcessor extends BaseProcessor {
  private_api_key: string;
  external_merchant_id: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  identification_type: string;
  public_api_key: string;
  extra_params: ExtraParams;
  country_iso?: string;
  automatic_capture?: boolean;
  mci_to_psp_as?: string;
}

interface ExtraParams {
  paypal_flow_id: string;
  highrisk_txn_flag: string;
  vertical: string;
}

const paypalACDCProcessor: PaypalACDCProcessor = {
  name: 'paypal_acdc',
  payment_processor_id: 53,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  identification_type: 'RUT',
  public_api_key:
    'ASV7KQNqbJxrW__2UkmeSVlo3e-rIyTecVP7srZlWHLS21LTIIHVG4T-8DZ-_1oh_oRpO7MithJkDXJX',
  private_api_key:
    'EIbIFC1cJAQRcAftn1QLizcDAD0Bk6V-GkX8OTZj-X8Ny78WJfEnJ_PDjxzX-8oiHJR8wPqy--jKNWal',
  external_merchant_id: '7YQCDFB3XTDUN',
  allow_installments: true,
  enable_3ds_authentication: false,
  extra_params: {
    paypal_flow_id: 'DEUNA_7YQCDFB3XTDUN_ACDC',
    highrisk_txn_flag: '1',
    vertical: 'retail',
  },
  mci_to_psp_as: 'MCI',
};

const paypalACDCProcessorAuthorize: PaypalACDCProcessor = {
  ...paypalACDCProcessor,
  automatic_capture: false,
};

const paypalACDCProcessorWithMCItoPSPasMSI: PaypalACDCProcessor = {
  ...paypalACDCProcessor,
  mci_to_psp_as: 'MSI',
};

const paypalACDCProcessorWithIC2B: PaypalACDCProcessor = {
  name: 'paypal_acdc',
  payment_processor_id: 53,
  enabled: true,
  currency_iso3: 'MXN',
  identification_type: 'RUT',
  public_api_key:
    'AetBG_tJkcdYQ8tzjbBSTeSXUC4TpV8wDjIhEcdeIprHKMa4daLFsraioWHNMZQ8qsTj6H_Bao1_BRF6',
  private_api_key:
    'EEpDEyOsZf98F_dd-brLGIkSSoeo6VfYzWXvYu-IEXwqrMlugzcvGcWVTEbJURLKYJF3BPvORTyvxHq0',
  country_iso: 'MX',
  external_merchant_id: '9XEB7GQBYZJN4',
  extra_params: {
    paypal_flow_id: 'DEUNA_7YQCDFB3XTDUN_ACDC',
    highrisk_txn_flag: '1',
    vertical: 'retail',
  },
  allow_installments: true,
  enable_3ds_authentication: false,
};

export {
  paypalACDCProcessor,
  paypalACDCProcessorAuthorize,
  paypalACDCProcessorWithMCItoPSPasMSI,
  paypalACDCProcessorWithIC2B,
};
