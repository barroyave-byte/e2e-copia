import { BaseCreditCard } from './baseCreditCard';

const cybersourceVisaCardSuccessful: BaseCreditCard = {
  number: '4111111111111111',
  expiration_date: '0330',
  cvv_code: '838',
  cardholder_name: 'Jean Roldan',
  document_number: '51682247503',
};

const cybersourceMasterCardSuccessful: BaseCreditCard = {
  number: '5555555555554444',
  expiration_date: '0330',
  cvv_code: '838',
  cardholder_name: 'Jean Roldan',
  document_number: '51682247503',
};

const cybersourceAmexSuccessful: BaseCreditCard = {
  number: '378282246310005',
  expiration_date: '0330',
  cvv_code: '1234',
  cardholder_name: 'Jean Roldan',
  document_number: '51682247503',
};

const cybersourceVisaFailed: BaseCreditCard = {
  number: '6759560045005727054',
  expiration_date: '1030',
  cvv_code: '641',
  cardholder_name: 'Jean Roldan',
  document_number: '51682247503',
};

export {
  cybersourceMasterCardSuccessful,
  cybersourceVisaCardSuccessful,
  cybersourceAmexSuccessful,
  cybersourceVisaFailed,
};
