import { BaseProcessor } from './baseProcessor';

interface ConektaProcessor extends BaseProcessor {
  public_api_key: string;
  private_api_key: string;
  allow_installments: boolean;
  enable_3ds_authentication: boolean;
  automatic_capture?: boolean;
  country_iso?: string;
}

interface ConektaProcessorMSIType extends BaseProcessor {
  conekta: { api_key: string };
  allow_installments: boolean;
}

const conektaProcessor: ConektaProcessor = {
  name: 'conekta_direct',
  payment_processor_id: 49,
  enabled: true,
  currency_iso3: 'MXN',
  public_api_key: 'key_P8DyJBxkXjWOUmg0CnF3jkg',
  private_api_key: 'key_neW0LNOc9mRDx4pMN0A80xM',
  allow_installments: true,
  enable_3ds_authentication: false
};

const conektaProcessorAuthorize: ConektaProcessor = {
  ...conektaProcessor,
  automatic_capture: false,
  country_iso: "MX"
};

const conektaProcessorMSI: ConektaProcessorMSIType = {
  name: 'conekta',
  payment_processor_id: 11,
  enabled: true,
  currency_iso3: 'MXN',
  conekta: { api_key: 'key_CzTYpBTBDQRQYvQiyoobpQ' },
  allow_installments: true,
};

export { conektaProcessor, conektaProcessorAuthorize, conektaProcessorMSI };
