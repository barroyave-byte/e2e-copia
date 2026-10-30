import { BaseCreditCard } from './baseCreditCard';

const getnetVisaSuccessful: BaseCreditCard = {
  number: '4012001037141112',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '23538791520',
};

const getnetMastercardSuccessful: BaseCreditCard = {
  number: '5448280000000007',
  expiration_date: '0930',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '23538791520',
};

const getnetMastercardDenied: BaseCreditCard = {
  number: '5180300000000039', //5155901222270002
  expiration_date: '0630',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '23538791520',
};

export { getnetVisaSuccessful, getnetMastercardSuccessful, getnetMastercardDenied };
