import { FraudProcessor } from './baseProcessor';

const siftFraudProcessor: FraudProcessor = {
  processor_id: 1,
  processor_name: 'SIFT',
  properties: [
    {
      metadata_id: 1,
      label: 'Api key',
      property_name: '4acd8936ec18cffc',
    },
    {
      metadata_id: 5,
      label: 'Account id',
      property_name: '60d362a574be22423cfbe776',
    },
  ],
};

const siftFraudProcessorFake: FraudProcessor = {
  processor_id: 1,
  processor_name: 'SIFT',
  properties: [
    {
      metadata_id: 1,
      label: 'Api key',
      property_name: '4acd8tegb4568ffc',
    },
    {
      metadata_id: 5,
      label: 'Account id',
      property_name: '59hgdsa574be224234tgryuu',
    },
  ],
};

export { siftFraudProcessor, siftFraudProcessorFake };
