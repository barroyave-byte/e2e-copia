import { BaseCreditCard } from './baseCreditCard';

const credibancoVisaSuccessful: BaseCreditCard = {
  number: '4563960122001999',
  expiration_date: '1230',
  cvv_code: '347',
  cardholder_name: 'Dari Boy',
  document_number: '1234569874',
};

const credibancoVisa3DSSuccessful: BaseCreditCard = {
  number: '4111111111111111',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'Dari Boy',
  document_number: '1234569874',
};

const credibancoMastercard3DSSuccessful: BaseCreditCard = {
  number: '5555555555555599',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'Dari Boy',
  document_number: '1234569874',
};

export { credibancoVisaSuccessful, credibancoVisa3DSSuccessful, credibancoMastercard3DSSuccessful };
