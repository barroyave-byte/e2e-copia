import { FraudProcessor } from './baseProcessor';

const cybersourceFraudProcessor: FraudProcessor = {
  processor_id: 3,
  processor_name: 'CYBERSOURCE',
  properties: [
    {
      metadata_id: 1,
      label: 'Key',
      property_name: 'c4159aba-9d6e-488f-87f8-8d21aecacc4d',
    },
    {
      metadata_id: 2,
      label: 'Merchant ID',
      property_name: 'deuna_dm',
    },
    {
      metadata_id: 6,
      label: 'Shared Secret',
      property_name: 'zcAcq8HrD4+DO+M7iJxoWfHpucAwJDNnh4Sc2jR52z8=',
    },
    {
      metadata_id: 7,
      label: 'Environment (test, live)',
      property_name: 'test',
    },
    {
      metadata_id: 35,
      label: 'Use “Review” status for 3DS (Yes or No)',
      property_name: 'no',
    },
    {
      metadata_id: 36,
      label: 'Deactivate “ShipTo” object (“Yes” or “No”)',
      property_name: 'no',
    },
  ],
};

const cybersourceFraudProcessorFake: FraudProcessor = {
  processor_id: 3,
  processor_name: 'CYBERSOURCE',
  properties: [
    {
      metadata_id: 1,
      label: 'Key',
      property_name: 'e7rh65k0-901a-42a9-8cc5-thyndjuriold',
    },
    {
      metadata_id: 2,
      label: 'Merchant ID',
      property_name: 'dm_fake_dm',
    },
    {
      metadata_id: 6,
      label: 'Shared Secret',
      property_name: '5qRi0vYwb5qUHcTzSisHSDr7ARE54673892gdtsc/+I=',
    },
    {
      metadata_id: 7,
      label: 'Environment (test, live)',
      property_name: 'test',
    },
    {
      metadata_id: 36,
      label: 'Deactivate “ShipTo” object (“Yes” or “No”)',
      property_name: 'no',
    },
  ],
};

export { cybersourceFraudProcessor, cybersourceFraudProcessorFake };
