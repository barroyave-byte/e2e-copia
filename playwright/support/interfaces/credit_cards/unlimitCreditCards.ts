import { BaseCreditCard } from './baseCreditCard';

const unlimitVisaSuccessful: BaseCreditCard = {
  number: '4000000000000077',
  expiration_date: '0630',
  cvv_code: '123',
  cardholder_name: 'John Smith',
  document_number: '3782822',
};

const unlimitVisaAuthorized: BaseCreditCard = {
  number: '4000000000000051',
  expiration_date: '0630',
  cvv_code: '123',
  cardholder_name: 'John Smith',
  document_number: '3782822',
};

const unlimitMasterCardSuccessful: BaseCreditCard = {
  number: '2400000000000077',
  expiration_date: '0630',
  cvv_code: '123',
  cardholder_name: 'John Smith',
  document_number: '3782822',
};

const unlimitFailed: BaseCreditCard = {
  number: '4444444444449777',
  expiration_date: '0630',
  cvv_code: '123',
  cardholder_name: 'John Smith',
  document_number: '3782822',
};

const unlimitThreeDSProcessed: BaseCreditCard = {
  number: '4000000000000085',
  expiration_date: '0630',
  cvv_code: '123',
  cardholder_name: 'John Smith',
  document_number: '3782822',
};
export {
  unlimitVisaSuccessful,
  unlimitMasterCardSuccessful,
  unlimitFailed,
  unlimitVisaAuthorized,
  unlimitThreeDSProcessed,
};
