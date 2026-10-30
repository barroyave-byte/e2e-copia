import { BaseCreditCard } from './baseCreditCard';

const worldpayVisaCardMPC: BaseCreditCard = {
  number: '4024007197692931',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'Jean Roldan',
  document_number: '23538791520',
};

const worldpayVisaCardSuccessful: BaseCreditCard = {
  number: '4000000000000077',
  expiration_date: '0630',
  cvv_code: '123',
  cardholder_name: 'Jean Roldan',
  document_number: '23538791520',
};

const worldpayMaestroCardFailed: BaseCreditCard = {
  number: '6759411100000008',
  expiration_date: '0630',
  cvv_code: '123',
  cardholder_name: 'Jean Roldan',
  document_number: '23538791520',
};

const worldpayMasterCardSuccessful: BaseCreditCard = {
  number: '5555555555554444',
  expiration_date: '0630',
  cvv_code: '123',
  cardholder_name: 'Jean Roldan',
  document_number: '23538791520',
};

// Test card respose failed with cardholder_name 'ERROR'.
const worldpayMasterCardFailed: BaseCreditCard = {
  number: '5555555555554444',
  expiration_date: '0630',
  cvv_code: '123',
  cardholder_name: 'CLEAR ERROR',
  document_number: '23538791520',
};

export {
  worldpayVisaCardSuccessful,
  worldpayMaestroCardFailed,
  worldpayMasterCardSuccessful,
  worldpayMasterCardFailed,
  worldpayVisaCardMPC,
};
