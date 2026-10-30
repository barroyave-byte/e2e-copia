import { BaseCreditCard } from './baseCreditCard';

const paypalACDCVisaSucessful: BaseCreditCard = {
  number: '4165020438374564', //4012000077777777
  expiration_date: '0528', //1127
  cvv_code: '555',
  cardholder_name: 'CLEAR APRO',
  document_number: '12345678',
};

const paypalACDCMasterCardSucessful: BaseCreditCard = {
  number: '5288775404117508',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Denys A Rosario',
  document_number: '1234567891',
};

export { paypalACDCVisaSucessful, paypalACDCMasterCardSucessful };
