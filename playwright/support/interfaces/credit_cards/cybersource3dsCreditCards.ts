import { BaseCreditCard } from './baseCreditCard';

const cybersource3dsVisaFrictionless: BaseCreditCard = {
  number: '4000000000002701',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'Deuna ThreeDS Success',
  document_number: '51682247503',
};

const cybersource3dsMastercardFrictionless: BaseCreditCard = {
  number: '5200000000002235',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'Deuna ThreeDS Success',
  document_number: '51682247503',
};

const cybersource3dsMastercardChallenge: BaseCreditCard = {
  number: '5200000000002151',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'Deuna ThreeDS Success',
  document_number: '51682247503',
};

const cybersource3dsVisaCheckEnrollmentTimeout: BaseCreditCard = {
  number: '4000000000002354',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'Deuna ThreeDS Success',
  document_number: '51682247503',
};

const cybersource3dsVisaFailedlFrictionlessAuthentication: BaseCreditCard = {
  number: '4000000000002925',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'Deuna ThreeDS Success',
  document_number: '51682247503',
};

const cybersource3dsVisaChallenge: BaseCreditCard = {
  number: '4000000000002503',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'Deuna ThreeDS Success',
  document_number: '51682247503',
};

const cybersource3dsVisaFailedChallenge: BaseCreditCard = {
  number: '4000000000002370',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'Deuna ThreeDS Success',
  document_number: '51682247503',
};

const cybersource3dsVisaAttemptedFrictionless: BaseCreditCard = {
  number: '4000000000002719',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'Deuna ThreeDS Success',
  document_number: '51682247503',
};

const cybersource3dsMastercardAttemptedFrictionless: BaseCreditCard = {
  number: '5200000000002482',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'Deuna ThreeDS Success',
  document_number: '51682247503',
};

export {
  cybersource3dsVisaFrictionless,
  cybersource3dsVisaChallenge,
  cybersource3dsVisaFailedlFrictionlessAuthentication,
  cybersource3dsVisaFailedChallenge,
  cybersource3dsVisaCheckEnrollmentTimeout,
  cybersource3dsMastercardFrictionless,
  cybersource3dsMastercardChallenge,
  cybersource3dsVisaAttemptedFrictionless,
  cybersource3dsMastercardAttemptedFrictionless,
};
