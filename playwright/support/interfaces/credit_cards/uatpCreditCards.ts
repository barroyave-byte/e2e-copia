import { BaseCreditCard } from './baseCreditCard';

const uatpSuccess: Omit<BaseCreditCard, 'cvv_code'> = {
  number: '135410189003949',
  expiration_date: '0627',
  cardholder_name: 'Jean Roldan',
  document_number: '12345678',
};

const uatpFailed = {
  number: '11067009610',
  expiration_date: '1230',
  cardholder_name: 'Cristhian Laurente',
  document_number: '12345678',
};

const uatpFailedByBank = {
  number: '135400000009712',
  expiration_date: '1230',
  cardholder_name: 'Cristhian Laurente',
  document_number: '12345678',
};

export { uatpFailed, uatpFailedByBank, uatpSuccess };
