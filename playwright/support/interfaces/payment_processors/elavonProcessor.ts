import { BaseProcessor } from './baseProcessor';

interface ElavonProcessor extends BaseProcessor {
  currency_iso3: string;
  country_iso: string;
  automatic_capture: boolean;
  external_merchant_id: string;
  public_api_key?: string;
  private_api_key?: string;
  acquirer_id: string;
  merchant_pwd: string;
  allow_installments: boolean;
  enable_3ds_authentication?: boolean;
  tokenize_guest_card?: boolean;
  exclude_cvv?: boolean;
  settlement_enable?: boolean;
  multiple_partial_capture?: boolean;
}

const elavonProcessorSettlement: ElavonProcessor = {
  name: 'Elavon USD Settlement E2E',
  payment_processor_id: 86,
  enabled: true,
  currency_iso3: 'USD',
  country_iso: 'US',
  automatic_capture: true,
  allow_installments: false,
  external_merchant_id: '290009300',
  acquirer_id: '01008600078',
  merchant_pwd: '42DUWITT',
  tokenize_guest_card: false,
  exclude_cvv: true,
  settlement_enable: true,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  extra_params: {
    terminalId: '00000002',
    posDataCode: '100050100000',
    serviceLocationCityName: 'Miami',
    merchantPaymentGatewayId: '00000123456',
    serviceLocationPostalCode: '11510',
    serviceLocationCountryCode: '840',
    industrySpecificTransactionIndicator: '',
    elavonJourneyId: '',
    freeTrialAndOfferIndicator: '',
    merchantName: 'Deuna',
    merchantCityName: 'Miami',
  },
};

const elavonProcessorAuthorizeSettlement: ElavonProcessor = {
  ...elavonProcessorSettlement,
  automatic_capture: false,
};

const elavonProcessorAuthorizeSettlementMPC: ElavonProcessor = {
  ...elavonProcessorSettlement,
  automatic_capture: false,
  multiple_partial_capture: true,
  multiple_partial_capture_mode: 'offline',
  transaction_config: {
    capture_cutoff_days: 7,
  },
};

const elavonProcessorAuthorize: ElavonProcessor = {
  ...elavonProcessorSettlement,
  automatic_capture: false,
};

export {
  elavonProcessorAuthorize,
  elavonProcessorSettlement,
  elavonProcessorAuthorizeSettlement,
  elavonProcessorAuthorizeSettlementMPC,
};
