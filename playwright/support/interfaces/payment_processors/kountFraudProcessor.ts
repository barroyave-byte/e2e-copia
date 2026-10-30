import { FraudProcessor } from './baseProcessor';

const kountProccesor: FraudProcessor = {
  processor_id: 7,
  processor_name: 'KOUNT',
  properties: [
    {
      metadata_id: 8,
      label: 'Private Key',
      property_name: 'MG9hMW9uempmdm9CNXN1WHkzNTg6YTd5M2VjcFBLU0FWaUNmTGRackhGZldXVGt1SFZRa2RWZ192Vl9ZZFNhQWZKQzR3akNRdElQX0VfYjhfWjNiMg==',
    },
    {
      metadata_id: 7,
      label: 'Environment (test, live)',
      property_name: 'test',
    },
    {
      metadata_id: 5,
      label: 'Account ID',
      property_name: '781660013918393',
    },
  ],
};

export { kountProccesor };
