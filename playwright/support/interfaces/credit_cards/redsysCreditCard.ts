import { BaseCreditCard } from './baseCreditCard';

const redsysMastercardSuccessful: BaseCreditCard = {
  number: '5424180805648190',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'John Smith',
  document_number: '67629145276',
};

const redsysMastercardDenied: BaseCreditCard = {
  number: '5576441563045037',
  expiration_date: '1249',
  cvv_code: '999',
  cardholder_name: 'John Smith',
  document_number: '67629145276',
};

const redsysVisaRejected: BaseCreditCard = {
  number: '4111111111111111',
  expiration_date: '1249',
  cvv_code: '999',
  cardholder_name: 'John Smith',
  document_number: '67629145276',
};

const redsysVisaThreeDSChallengeWithThreeDSMethod: BaseCreditCard = {
  number: '4918019199883839',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'John Smith',
  document_number: '67629145276',
};

const redsysVisaThreeDSChallengeWithoutThreeDSMethod: BaseCreditCard = {
  number: '4548817212493017',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'John Smith',
  document_number: '67629145276',
};

const redsysVisaThreeDSFrictionlessWithThreeDSMethod: BaseCreditCard = {
  number: '4918019160034602',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'John Smith',
  document_number: '67629145276',
};

const redsysVisaThreeDSFrictionlessWithoutThreeDSMethod: BaseCreditCard = {
  number: '4548814479727229',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'John Smith',
  document_number: '67629145276',
};

export {
  redsysMastercardSuccessful,
  redsysVisaThreeDSChallengeWithThreeDSMethod,
  redsysVisaThreeDSChallengeWithoutThreeDSMethod,
  redsysMastercardDenied,
  redsysVisaThreeDSFrictionlessWithThreeDSMethod,
  redsysVisaThreeDSFrictionlessWithoutThreeDSMethod,
  redsysVisaRejected,
};
