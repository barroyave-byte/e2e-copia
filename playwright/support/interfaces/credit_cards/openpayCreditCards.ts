import { BaseCreditCard } from './baseCreditCard';

const openpayVisaFailed: BaseCreditCard = {
  number: '4000000000000044',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722768',
};

const openpayMastercardSuccessful: BaseCreditCard = {
  number: '5105105105105100',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722768',
};

const openpayVisaSuccessful: BaseCreditCard = {
  number: '4242424242424242',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722768',
};

const openpayMastercardFailed: BaseCreditCard = {
  number: '4000000000000044',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Dany Boy',
  document_number: '1315722768',
};

const openpay3ds: BaseCreditCard = {
  number: '4111111111111111',
  expiration_date: '1127',
  cvv_code: '000',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722768',
};

export {
  openpayVisaFailed,
  openpayMastercardFailed,
  openpayMastercardSuccessful,
  openpay3ds,
  openpayVisaSuccessful,
};
