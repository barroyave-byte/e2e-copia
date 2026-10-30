import { FraudProcessor } from './baseProcessor';

const clearsaleBrasilFraudProcessor: FraudProcessor = {
  processor_id: 5,
  processor_name: 'CLEARSALE-BRASIL',
  properties: [
    {
      metadata_id: 2,
      label: 'Login / Nome',
      property_name: 'DeunaTG',
    },
    {
      metadata_id: 6,
      label: 'Senha',
      property_name: 'KnrsXReUZx',
    },
    {
      metadata_id: 7,
      label: 'Ambiente (test ou live)',
      property_name: 'test',
    },
  ],
};

export { clearsaleBrasilFraudProcessor };
