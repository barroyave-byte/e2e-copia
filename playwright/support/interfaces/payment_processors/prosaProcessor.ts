import { BaseProcessor } from './baseProcessor';

interface ProsaProcessor extends BaseProcessor {
  extra_params: {
    merchantType: string;
    acquirerCode: string;
    merchantId: string;
    receivingInstitutionIdCode: string;
    preAuthorizationHold: string;
    terminalId: string;
    affiliation: string;
    terminalName: string;
    terminalOwner: string;
    terminalNetwork: string;
    terminalTimeOffset: string;
    terminalCity: string;
    terminalState: string;
    terminalCountry: string;
    zipCode: string;
  };
}

const prosaProcessor: ProsaProcessor = {
  name: 'Prosa Refund',
  payment_processor_id: 115,
  enabled: true,
  currency_iso3: 'HNL',
  transaction_config: {
    refund_cutoff_days: 6,
  },
  extra_params: {
    merchantType: '124',
    acquirerCode: '234',
    merchantId: '12553',
    receivingInstitutionIdCode: '123',
    preAuthorizationHold: '12',
    terminalId: '0000000033',
    affiliation: '12',
    terminalName: 'Terminal Name',
    terminalOwner: 'Terminal Owner',
    terminalNetwork: 'Terminal Network',
    terminalTimeOffset: '50',
    terminalCity: 'Terminal City',
    terminalState: 'Terminal State',
    terminalCountry: 'Terminal Country',
    zipCode: '12345',
  },
};

const prosaProcessorAuthorizeMPRNewInfo: ProsaProcessor = {
  ...prosaProcessor,
  name: 'Prosa Refund 34',
  country_iso: 'MX',
  transaction_config: {
    refund_cutoff_days: 34,
  },
};
export { prosaProcessor, ProsaProcessor, prosaProcessorAuthorizeMPRNewInfo };
