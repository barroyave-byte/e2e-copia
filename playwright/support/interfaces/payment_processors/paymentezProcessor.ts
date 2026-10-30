import { BaseProcessor } from './baseProcessor';

interface PaymentezProcessor extends BaseProcessor {
  private_api_key: string;
  external_merchant_id: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  mci_to_psp_as: string;
}

const paymentezProcessor: PaymentezProcessor = {
  name: 'paymentez_direct',
  payment_processor_id: 63,
  enabled: true,
  currency_iso3: 'USD',
  country_iso: 'EC',
  private_api_key: 'fW1Jhav1f70shUdlOvIFiRQOErMYH9',
  external_merchant_id: 'DEUNASTG-EC',
  allow_installments: true,
  enable_3ds_authentication: false,
  mci_to_psp_as: 'MCI',
};

const paymentezProcessorMX: PaymentezProcessor = {
  name: 'paymentez_direct',
  payment_processor_id: 63,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  private_api_key: 'fW1Jhav1f70shUdlOvIFiRQOErMYH9',
  external_merchant_id: 'DEUNASTG-EC',
  allow_installments: true,
  enable_3ds_authentication: false,
  mci_to_psp_as: 'MCI',
};

const paymentezProcessorAuthorize: PaymentezProcessor = {
  ...paymentezProcessor,
  automatic_capture: false,
  country_iso: 'EC',
};

const paymentezProcessor3DS: PaymentezProcessor = {
  ...paymentezProcessor,
  enable_3ds_authentication: true,
};

const paymentezProcessorWithMCItoPSPasMSI: PaymentezProcessor = {
  ...paymentezProcessor,
  mci_to_psp_as: 'MSI',
};

const paymentezProcessorEC: PaymentezProcessor = {
  ...paymentezProcessor,
  country_iso: 'EC',
};

export {
  paymentezProcessor,
  paymentezProcessorAuthorize,
  paymentezProcessor3DS,
  paymentezProcessorWithMCItoPSPasMSI,
  paymentezProcessorEC,
  paymentezProcessorMX,
};
