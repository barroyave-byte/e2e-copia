import { BaseCreditCard } from './baseCreditCard';

const ebanxVisaSuccessful: BaseCreditCard = {
  number: '4111111111111111',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'John Doe',
  document_number: '11960610767',
};

const ebanxDebitCardSuccessful: BaseCreditCard = {
  number: '4000000000001000',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'John Doe',
  document_number: '11960610767',
};

export { ebanxVisaSuccessful, ebanxDebitCardSuccessful };
