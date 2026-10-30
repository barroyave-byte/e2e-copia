import { BaseCreditCard } from './baseCreditCard';

const elavonVisaSuccessfull: BaseCreditCard = {
  number: '4000000000000002',
  expiration_date: '0529',
  cvv_code: '110',
  cardholder_name: 'Prueba por Deuna',
  document_number: '12334568799',
};

const elavonVisaFailed: BaseCreditCard = {
  number: '4656376740825701',
  expiration_date: '0529',
  cvv_code: '123',
  cardholder_name: 'Prueba por Deuna',
  document_number: '12334568799',
};

const elavonDiscoverSuccessfull: BaseCreditCard = {
  number: '6011000000000004',
  expiration_date: '0529',
  cvv_code: '110',
  cardholder_name: 'Prueba por Deuna',
  document_number: '12334568799',
};

export { elavonDiscoverSuccessfull, elavonVisaFailed, elavonVisaSuccessfull };
