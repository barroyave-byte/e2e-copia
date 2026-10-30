import { BaseProcessor } from './baseProcessor';

export interface UATPProcessor extends BaseProcessor {
  allow_installments: boolean;
  tokenize_guest_card: boolean;
  exclude_cvv: boolean;
  settlement_enable: boolean;
  multiple_partial_capture?: boolean;
  flow: string;
  flow_version: string;
}

const uatpProcessor: UATPProcessor = {
  name: 'uatp',
  payment_processor_id: 109,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  automatic_capture: true,
  allow_installments: false,
  external_merchant_id: 'uatp_deuna',
  merchant_pwd: 'cnfGf0Aibb9iVcrt',
  tokenize_guest_card: true,
  exclude_cvv: false,
  settlement_enable: false,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  extra_params: {
    institutionIdentificationCode: '484141001',
    merchantCode: '036',
    merchantName: 'VOLARIS',
    placeOfIssue: 'Mexico City',
    agentNumericCode: '484141001',
    submittingSource: '4141',
  },
};

const uatpProcessorSettlement: UATPProcessor = {
  name: 'uatp',
  payment_processor_id: 109,
  enabled: true,
  currency_iso3: 'MXN',
  country_iso: 'MX',
  automatic_capture: true,
  allow_installments: false,
  external_merchant_id: 'uatp_deuna',
  merchant_pwd: 'cnfGf0Aibb9iVcrt',
  tokenize_guest_card: false,
  exclude_cvv: true,
  settlement_enable: true,
  flow: 'payconnect',
  flow_version: 'multi_step_workflow',
  extra_params: {
    institutionIdentificationCode: '484141001',
    agentNumericCode: '484141001',
    placeOfIssue: 'Mexico City',
    merchantCode: '036',
    merchantName: 'VOLARIS',
    submittingSource: '4141',
  },
};

const uatpProcessorSettlementAuthorize: UATPProcessor = {
  ...uatpProcessorSettlement,
  automatic_capture: false,
};

const uatpProcessorMPCOfflineSettlement: UATPProcessor = {
  ...uatpProcessorSettlement,
  automatic_capture: false,
  settlement_enable: true,
  multiple_partial_capture: true,
  multiple_partial_capture_mode: 'offline',
  transaction_config: {
    capture_cutoff_days: 1,
  },
};

export {
  uatpProcessor,
  uatpProcessorSettlement,
  uatpProcessorSettlementAuthorize,
  uatpProcessorMPCOfflineSettlement,
};
