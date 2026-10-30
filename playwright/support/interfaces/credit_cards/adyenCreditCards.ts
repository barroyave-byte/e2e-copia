import { BaseCreditCard } from './baseCreditCard';

const adyenVisaSuccessful: BaseCreditCard = {
  number: '4000020000000000',
  expiration_date: '0330',
  cvv_code: '737',
  cardholder_name: 'Prueba Deuna',
  document_number: '12345678'
};

const adyenVisaSuccessfulMX: BaseCreditCard = {
  number: '4607000000000009',
  expiration_date: '0330',
  cvv_code: '737',
  cardholder_name: 'Prueba Deuna',
  document_number: '12345678'
};

const adyen3DS: BaseCreditCard = {
    number: '340000099900051',
    expiration_date: '0330',
    cvv_code: '737',
    cardholder_name: 'Prueba Deuna',
    document_number: '12345678'
  };

export { adyenVisaSuccessful, adyen3DS, adyenVisaSuccessfulMX };