import { FraudProcessor } from './baseProcessor';

const clearsaleFraudProcessor: FraudProcessor = {
  processor_id: 4,
  processor_name: 'CLEARSALE',
  properties: [
    {
      metadata_id: 1,
      label: 'Api key',
      property_name: '2E747CE7-2E1E-4CFF-89CF-27E95F951DF1',
    },
    {
      metadata_id: 2,
      label: 'Client Id',
      property_name: 'deuna.sandbox',
    },
    {
      metadata_id: 6,
      label: 'Client secret',
      property_name: 'k3G9R0D5lz',
    },
    {
      metadata_id: 7,
      label: 'Environment (test, live)',
      property_name: 'test',
    },
  ],
};

const clearsaleFraudProcessorFake: FraudProcessor = {
  processor_id: 4,
  processor_name: 'CLEARSALE',
  properties: [
    {
      metadata_id: 1,
      label: 'Api key',
      property_name: 'EGBR74K9-2E1E-4CFF-89CF-EHU5673KFYT9',
    },
    {
      metadata_id: 2,
      label: 'Client Id',
      property_name: 'fake.client.id',
    },
    {
      metadata_id: 6,
      label: 'Client secret',
      property_name: 't7Gr28kTT0',
    },
    {
      metadata_id: 7,
      label: 'Environment (test, live)',
      property_name: 'test',
    },
  ],
};

export { clearsaleFraudProcessor, clearsaleFraudProcessorFake };
