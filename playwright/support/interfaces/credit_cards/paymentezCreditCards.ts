import { BaseCreditCard } from './baseCreditCard';

const paymentezDinerSuccessful: BaseCreditCard = {
  number: '36417002140808',
  expiration_date: '0528',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722768',
};

const paymentezVisaSuccessful: BaseCreditCard = {
  number: '4111111111111111',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Dany Boy',
  document_number: '1234569874',
};

const paymentezMastercardSuccessful: BaseCreditCard = {
  number: '5101081046006034',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'DEUNAa Prueba',
  document_number: '1234569874',
};

const paymentezMastercardFailed: BaseCreditCard = {
  number: '378196561987405',
  expiration_date: '1127',
  cvv_code: '1234',
  cardholder_name: 'DEUNAa Prueba',
  document_number: '1234569874',
};

const paymentez3ds: BaseCreditCard = {
  number: '2221008123677736',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Duna Developers',
  document_number: '185396924',
};

const paymentezDiscoverSuccessful: BaseCreditCard = {
  number: '6011000990139424',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Duna Developers',
  document_number: '185396924',
};

export {
  paymentezDinerSuccessful,
  paymentezVisaSuccessful,
  paymentezMastercardSuccessful,
  paymentezMastercardFailed,
  paymentez3ds,
  paymentezDiscoverSuccessful,
};
