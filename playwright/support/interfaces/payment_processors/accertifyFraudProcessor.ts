import { FraudProcessor } from './baseProcessor';

const accertifyProcessor: FraudProcessor = {
  processor_id: 9,
  processor_name: 'ACCERTIFY',
  properties: [
    {
      metadata_id: 10,
      label: 'Username',
      property_name: 'volaris_icnow_dev_nav',
    },
    {
      metadata_id: 7,
      label: 'Environment',
      property_name: 'test',
    },
    {
      metadata_id: 11,
      label: 'Password',
      property_name: 'W9jQ7$Fq7',
    },
  ],
};

export { accertifyProcessor };
