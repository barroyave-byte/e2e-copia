import { FraudProcessor } from './baseProcessor';

const riskifiedProccesor: FraudProcessor = {
  processor_id: 8,
  processor_name: 'RISKIFIED',
  properties: [
    {
      metadata_id: 17,
      label: 'Shop URL',
      property_name: 'deuna_test.com',
    },
    {
      metadata_id: 7,
      label: 'Environment (test or live)',
      property_name: 'test',
    },
    {
      metadata_id: 1,
      label: 'Auth Token',
      property_name: '61520c2a7a2836cd0afaa665ec187db3',
    },
    {
      metadata_id: 37,
      label: 'Enable 3DS recommendation ("Yes" or "No")',
      property_name: 'no',
    },
  ],
};

export { riskifiedProccesor };
