import { BaseProcessor } from './baseProcessor';

export interface DeunaWalletProcessor extends BaseProcessor {
  private_api_key: string;
  public_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
  extra_params: {
    point_of_sale: string;
    format?: string;
  };
}

// The literal below satisfies DeunaWalletProcessor in full, so `Partial<>` only served to
// make `name` optional — which is what the spreads at the call sites then tripped over.
const deunaWalletProcessor: DeunaWalletProcessor = {
  name: 'DEUNA_WALLET',
  payment_processor_id: 148,
  enabled: true,
  currency_iso3: 'USD',
  country_iso: 'EC',
  public_api_key: 'a89fe446d7ea4af3a580c5ebd9c75724',
  private_api_key: '0d512143922d455f9b0eb06ef768cfec',
  allow_installments: false,
  enable_3ds_authentication: false,
  automatic_capture: true,
  extra_params: {
    point_of_sale: '4210264',
  },
};

const DeunaWalletAuthorizeProcessor: DeunaWalletProcessor = {
  ...deunaWalletProcessor,
  automatic_capture: false,
} as DeunaWalletProcessor;

function createDeunaWalletProcessor(
  format: 'qr' | 'code',
  setAutomaticCapture: boolean = true,
  force_currency_code?: string
): DeunaWalletProcessor {
  const processor = {
    ...deunaWalletProcessor,
    extra_params: {
      ...deunaWalletProcessor.extra_params,
      format,
    },
  } as DeunaWalletProcessor;

  if (setAutomaticCapture) {
    processor.automatic_capture = false;
  }
  if (force_currency_code) {
    processor.currency_iso3 = force_currency_code;
  }

  return processor;
}

export { deunaWalletProcessor, createDeunaWalletProcessor, DeunaWalletAuthorizeProcessor };
