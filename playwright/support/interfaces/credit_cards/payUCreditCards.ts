import { BaseCreditCard } from './baseCreditCard';

const payUMasterCardSuccessful: BaseCreditCard = {
  number: '5491380000000001',
  expiration_date: '0528',
  cvv_code: '777',
  cardholder_name: 'CLEAR APPROVED',
  document_number: '11111111',
};

const payUVisaColombiaSuccessful: BaseCreditCard = {
  number: '4097440000000004',
  expiration_date: '0528',
  cvv_code: '777',
  cardholder_name: 'CLEAR APPROVED',
  document_number: '11111111',
};

const payUVisaSuccessful: BaseCreditCard = {
  number: '4268070000000002',
  expiration_date: '0528',
  cvv_code: '777',
  cardholder_name: 'CLEAR APPROVED',
  document_number: '11111111',
};

export { payUMasterCardSuccessful, payUVisaSuccessful, payUVisaColombiaSuccessful };
