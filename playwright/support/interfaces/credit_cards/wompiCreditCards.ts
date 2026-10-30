import { BaseCreditCard } from './baseCreditCard';

const wompiVisaSuccessfull: BaseCreditCard = {
  number: '4242424242424242',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Jose Perez',
  document_number: '185396924',
};

const wompiVisaFailed: BaseCreditCard = {
  number: '4111111111111111', // Other card number is '4444444444449777',
  expiration_date: '1229',
  cvv_code: '789',
  cardholder_name: 'Jose Perez',
  document_number: '185396924',
};

export { wompiVisaSuccessfull, wompiVisaFailed };
