import { BaseCreditCard } from './baseCreditCard';

const pagbankVisaSuccessfulProcessing: BaseCreditCard = {
  number: '4111111111111111',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '51811627382',
};

const pagbankFailed: BaseCreditCard = {
  number: '5571048087884745',
  expiration_date: '1226',
  cvv_code: '123',
  cardholder_name: 'Tony Stark',
  document_number: '25506354347',
};

const pagbankVisaRejected: BaseCreditCard = {
  number: '4365878144296985',
  expiration_date: '0927',
  cvv_code: '806',
  cardholder_name: 'Tony Stark',
  document_number: '25506354347',
};

const pagbankVisaInvalidCVV: BaseCreditCard = {
  number: '5571048087884745',
  expiration_date: '1226',
  cvv_code: '123',
  cardholder_name: 'Tony Stark',
  document_number: '25506354347',
};

const pagbankRejectedUnauthorized: BaseCreditCard = {
  number: '4168818844447115',
  expiration_date: '1126',
  cvv_code: '351',
  cardholder_name: 'Tony Stark',
  document_number: '25506354347',
};

const pagbankMasterCardSucessful: BaseCreditCard = {
  number: '5240082975622454',
  expiration_date: '1226',
  cvv_code: '123',
  cardholder_name: 'Prueba por Deuna',
  document_number: '01354778910',
};

const pagbankMasterCardNubankSucessful: BaseCreditCard = {
  number: '5162927823929176',
  expiration_date: '0730',
  cvv_code: '296',
  cardholder_name: 'Alicja Romano',
  document_number: '01354778910',
};

const pagbankVisaCredicardSucessful: BaseCreditCard = {
  number: '4006891498707114',
  expiration_date: '0126',
  cvv_code: '551',
  cardholder_name: 'Jacob Gorska',
  document_number: '01354778910',
};

export {
  pagbankFailed,
  pagbankVisaRejected,
  pagbankRejectedUnauthorized,
  pagbankVisaSuccessfulProcessing,
  pagbankMasterCardSucessful,
  pagbankMasterCardNubankSucessful,
  pagbankVisaCredicardSucessful,
};
