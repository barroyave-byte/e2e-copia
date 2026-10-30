import { BaseCreditCard } from './baseCreditCard';

const powertranzVisaSuccessful: BaseCreditCard = {
  number: '4012000000020071',
  expiration_date: '1133',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '162915134',
};

const powertranzMastercardSuccessful: BaseCreditCard = {
  number: '5100270000000023',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '162915134',
};

const powertranzVisa3dsChallengeSuccessful: BaseCreditCard = {
  ...powertranzVisaSuccessful,
  number: '4012000000020006',
};

const powertranzVisa3dsFingerprintSuccessful: BaseCreditCard = {
  ...powertranzVisaSuccessful,
  number: '4012010000020070',
};

const powertranzVisa3dsFingerprintChallengeSuccessful: BaseCreditCard = {
  ...powertranzVisaSuccessful,
  number: '4012010000020005',
};

export {
  powertranzVisaSuccessful,
  powertranzMastercardSuccessful,
  powertranzVisa3dsChallengeSuccessful,
  powertranzVisa3dsFingerprintSuccessful,
  powertranzVisa3dsFingerprintChallengeSuccessful,
};
