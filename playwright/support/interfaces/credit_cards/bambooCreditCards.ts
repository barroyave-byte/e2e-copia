import { BaseCreditCard } from './baseCreditCard';

const bambooMastercadSuccessfull: BaseCreditCard = {
  number: '5299910010000015',
  expiration_date: '0830',
  cvv_code: '123',
  cardholder_name: 'John Smith',
  document_number: '74857601',
};

const bambooVisaSuccessfull: BaseCreditCard = {
  number: '4704550000000005',
  expiration_date: '1229',
  cvv_code: '123',
  cardholder_name: 'Joao Silva',
  document_number: '12345678901',
};

const bambooFailed: BaseCreditCard = {
  number: '6319039142546283',
  expiration_date: '0830',
  cvv_code: '123',
  cardholder_name: 'John Smith',
  document_number: '74857601',
};

const bambooCreditCardUY: BaseCreditCard = {
  number: '4704550000000005',
  expiration_date: '1229',
  cvv_code: '123',
  cardholder_name: 'Jhon Smith',
  document_number: '123456789',
};

const bambooVisaSuccessfullAR: BaseCreditCard = {
  number: '4704550000000005',
  expiration_date: '1229',
  cvv_code: '123',
  cardholder_name: 'Juan Perez',
  document_number: '12345678',
};

export { bambooMastercadSuccessfull, bambooVisaSuccessfull, bambooFailed , bambooCreditCardUY, bambooVisaSuccessfullAR };
