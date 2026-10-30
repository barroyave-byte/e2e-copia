import { BaseCreditCard } from './baseCreditCard';

const pagarmeVisaSuccessful: BaseCreditCard = {
  number: '4000000000000069', // 4000000000000010
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '67629145276',
};

const pagarmeVisaSuccessfulProcessing: BaseCreditCard = {
  number: '4000000000000036',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '67629145276',
};

const pagarmeFailed: BaseCreditCard = {
  number: '4000000000000028',
  expiration_date: '1126',
  cvv_code: '351',
  cardholder_name: 'Tony Stark',
  document_number: '25506354347',
};

const pagarmeVisaRejected: BaseCreditCard = {
  number: '4000000000000044',
  expiration_date: '1126',
  cvv_code: '351',
  cardholder_name: 'Tony Stark',
  document_number: '25506354347',
};

const pagarmeRejectedUnauthorized: BaseCreditCard = {
  number: '4168818844447115',
  expiration_date: '1126',
  cvv_code: '351',
  cardholder_name: 'Tony Stark',
  document_number: '25506354347',
};

export {
  pagarmeVisaSuccessful,
  pagarmeFailed,
  pagarmeVisaRejected,
  pagarmeRejectedUnauthorized,
  pagarmeVisaSuccessfulProcessing,
};
