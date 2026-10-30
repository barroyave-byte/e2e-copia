import { BaseCreditCard } from './baseCreditCard';

const evopaymentsMastercardSuccessful: BaseCreditCard = {
  number: '5123456789012346',
  expiration_date: '0139',
  cvv_code: '0000',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722768'
};

const evopayments3ds: BaseCreditCard = {
  number: '340000099900051',
  expiration_date: '0139',
  cvv_code: '0000',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722768'
};

export { evopaymentsMastercardSuccessful, evopayments3ds };