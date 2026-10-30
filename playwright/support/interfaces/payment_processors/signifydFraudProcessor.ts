import { FraudProcessor } from './baseProcessor';

const signifydFraudProcessor: FraudProcessor = {
  processor_id: 2,
  processor_name: 'SIGNIFYD',
  properties: [
    {
      metadata_id: 34,
      label: 'Send Authorization code in Transaction Endpoint',
      property_name: 'No',
    },
    {
      metadata_id: 5,
      label: 'Team Name',
      property_name: 'deuna_dm',
    },
    {
      metadata_id: 1,
      label: 'Api key',
      property_name: 'aKrFbVJqLvSte6GYNAtvBdaP0pVwFqOd',
    },
    {
      metadata_id: 22,
      label: 'Coverage Requests',
      property_name: 'FRAUD,INR',
    },
    {
      metadata_id: 23,
      label: 'Decision mechanism',
      property_name: 'SIGNIFYD_RECOMMENDATION',
    },
    {
      metadata_id: 24,
      label: 'Default Gateway name',
      property_name: '0',
    },
    {
      metadata_id: 25,
      label: 'Seller Domain URL',
      property_name: 'seller.com',
    },
    {
      metadata_id: 26,
      label: 'Domain creation date in the Seller platform',
      property_name: '2023-01-15',
    },
    {
      metadata_id: 27,
      label: 'Seller e-mail',
      property_name: 'seller@example.com',
    },
    {
      metadata_id: 28,
      label: 'Seller phone',
      property_name: '+1234567890',
    },
    {
      metadata_id: 29,
      label: 'Seller Street address',
      property_name: '123 Main St',
    },
    {
      metadata_id: 30,
      label: 'Seller Postal Code',
      property_name: '12345',
    },
    {
      metadata_id: 31,
      label: 'Seller City',
      property_name: 'New York',
    },
    {
      metadata_id: 32,
      label: 'Seller Province Code',
      property_name: 'NY',
    },
    {
      metadata_id: 33,
      label: 'Seller Country code',
      property_name: 'US',
    },
  ],
};

const signifydFraudProcessorSecondary: FraudProcessor = {
  processor_id: 2,
  processor_name: 'SIGNIFYD',
  properties: [
    {
      metadata_id: 34,
      label: 'Send Authorization code in Transaction Endpoint',
      property_name: 'No',
    },
    {
      metadata_id: 5,
      label: 'Team Name',
      property_name: 'e2e',
    },
    {
      metadata_id: 1,
      label: 'Api key',
      property_name: 'aKrFbVJqLvSte6GYNAtvBdaP0pVwFqOd',
    },
    {
      metadata_id: 22,
      label: 'Coverage Requests',
      property_name: 'FRAUD,INR',
    },
    {
      metadata_id: 23,
      label: 'Decision mechanism',
      property_name: 'SIGNIFYD_RECOMMENDATION',
    },
    {
      metadata_id: 24,
      label: 'Default Gateway name',
      property_name: '0',
    },
    {
      metadata_id: 25,
      label: 'Seller Domain URL',
      property_name: '0',
    },
    {
      metadata_id: 26,
      label: 'Domain creation date in the Seller platform',
      property_name: '0',
    },
    {
      metadata_id: 27,
      label: 'Seller e-mail',
      property_name: '0',
    },
    {
      metadata_id: 28,
      label: 'Seller phone',
      property_name: '0',
    },
    {
      metadata_id: 29,
      label: 'Seller Street address',
      property_name: '0',
    },
    {
      metadata_id: 30,
      label: 'Seller Postal Code',
      property_name: '0',
    },
    {
      metadata_id: 31,
      label: 'Seller City',
      property_name: '0',
    },
    {
      metadata_id: 32,
      label: 'Seller Province Code',
      property_name: '0',
    },
    {
      metadata_id: 33,
      label: 'Seller Country code',
      property_name: '0',
    },
  ],
};

const signifydFraudProcessorFake: FraudProcessor = {
  processor_id: 2,
  processor_name: 'SIGNIFYD',
  properties: [
    {
      metadata_id: 34,
      label: 'Send Authorization code in Transaction Endpoint',
      property_name: 'No',
    },
    {
      metadata_id: 5,
      label: 'Team Name',
      property_name: 'organifake_fake',
    },
    {
      metadata_id: 1,
      label: 'Api key',
      property_name: 'aKrFbVJqLvSte6GYNAtvBdaP0pVwFqOd',
    },
    {
      metadata_id: 22,
      label: 'Coverage Requests',
      property_name: 'FRAUD,INR',
    },
    {
      metadata_id: 23,
      label: 'Decision mechanism',
      property_name: 'SIGNIFYD_RECOMMENDATION',
    },
    {
      metadata_id: 24,
      label: 'Default Gateway name',
      property_name: '0',
    },
    {
      metadata_id: 25,
      label: 'Seller Domain URL',
      property_name: '0',
    },
    {
      metadata_id: 26,
      label: 'Domain creation date in the Seller platform',
      property_name: '0',
    },
    {
      metadata_id: 27,
      label: 'Seller e-mail',
      property_name: '0',
    },
    {
      metadata_id: 28,
      label: 'Seller phone',
      property_name: '0',
    },
    {
      metadata_id: 29,
      label: 'Seller Street address',
      property_name: '0',
    },
    {
      metadata_id: 30,
      label: 'Seller Postal Code',
      property_name: '0',
    },
    {
      metadata_id: 31,
      label: 'Seller City',
      property_name: '0',
    },
    {
      metadata_id: 32,
      label: 'Seller Province Code',
      property_name: '0',
    },
    {
      metadata_id: 33,
      label: 'Seller Country code',
      property_name: '0',
    },
  ],
};

export { signifydFraudProcessor, signifydFraudProcessorFake, signifydFraudProcessorSecondary };
