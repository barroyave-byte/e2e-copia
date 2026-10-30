import { BaseCreditCard } from './baseCreditCard';

const stripeVisaFailed: BaseCreditCard = {
  number: '4000000000000002',
  expiration_date: '0527',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722768',
};

const stripeMastercardSuccessful: BaseCreditCard = {
  number: '2223003122003222',
  expiration_date: '0527',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722768',
};

const stripeMastercardFailed: BaseCreditCard = {
  number: '2223003122003222',
  expiration_date: '0595',
  cvv_code: '123',
  cardholder_name: 'CLEAR Prueba',
  document_number: '1315722768',
};

const stripeVisaSuccessful: BaseCreditCard = {
  number: '4242424242424242',
  expiration_date: '0527',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722768',
};

const stripe3dsChallenge: BaseCreditCard = {
  number: '4000000000003220',
  expiration_date: '1139',
  cvv_code: '123',
  cardholder_name: 'Jean Roldan',
  document_number: '1315722768',
};

const stripe3dsPass: BaseCreditCard = {
  number: '4000000000003220',
  expiration_date: '0139',
  cvv_code: '0000',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722768',
};

const stripe3dsFailed: BaseCreditCard = {
  number: '4168818844447115',
  expiration_date: '0139',
  cvv_code: '0000',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722768',
};

const stripeVisaSuccessfulFraudAprove: BaseCreditCard = {
  number: '4242424242424242',
  expiration_date: '1139',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '1315722768',
};

const stripeVisaSuccessfulFraudReprove: BaseCreditCard = {
  number: '4242424242424242',
  expiration_date: '1139',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '01354778912',
};

const stripeVisaSuccessfulFraudManualReview: BaseCreditCard = {
  number: '4242424242424242',
  expiration_date: '0527',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722763',
};

export {
  stripeVisaFailed,
  stripeMastercardSuccessful,
  stripe3dsChallenge,
  stripe3dsPass,
  stripe3dsFailed,
  stripeVisaSuccessful,
  stripeVisaSuccessfulFraudAprove,
  stripeVisaSuccessfulFraudReprove,
  stripeVisaSuccessfulFraudManualReview,
  stripeMastercardFailed,
};
