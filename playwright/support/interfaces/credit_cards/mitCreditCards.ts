import { BaseCreditCard } from './baseCreditCard';

const mitVisaSuccessfull: BaseCreditCard = {
  number: '5474925432670366',
  expiration_date: '0526',
  cvv_code: '123',
  cardholder_name: 'Prueba por Deuna',
  document_number: '12334568799',
};

const mitVisaFailed: BaseCreditCard = {
  number: '5454545454545454',
  expiration_date: '0526',
  cvv_code: '123',
  cardholder_name: 'Prueba por Deuna',
  document_number: '12334568799',
};

const mitVisa3DSSuccessfull: BaseCreditCard = {
  number: '4111111111111111',
  expiration_date: '0526',
  cvv_code: '123',
  cardholder_name: 'Prueba por Deuna',
  document_number: '12334568799',
};

export { mitVisa3DSSuccessfull, mitVisaFailed, mitVisaSuccessfull };
