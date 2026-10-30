import { BaseCreditCard } from './baseCreditCard';

const fiserv3DSChallengueWithOutIframe: BaseCreditCard = {
  number: '4147463011110059',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'John Doe',
  document_number: '74857601',
};

const fiserv3DSChallengueWithIframe: BaseCreditCard = {
  number: '5204740000002745',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'John Doe',
  document_number: '74857601',
};

const fiserv3DSFrictionlessWithOutIframe: BaseCreditCard = {
  number: '4147463011110083',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'John Doe',
  document_number: '74857601',
};

const fiserv3DSFrictionlessWithIframe: BaseCreditCard = {
  number: '5239290700000044',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'John Doe',
  document_number: '74857601',
};

const fiservMastercardSuccessful: BaseCreditCard = {
  number: '5532533524405640',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'John Doe',
  document_number: '74857601',
};

const fiservAmexFailed: BaseCreditCard = {
  number: '373953192351004',
  expiration_date: '1230',
  cvv_code: '1234',
  cardholder_name: 'John Doe',
  document_number: '74857601',
};

const fiservArgentina3DSMastercard: BaseCreditCard = {
  number: '5165850000000008',
  expiration_date: '1229',
  cvv_code: '123',
  cardholder_name: 'John Doe',
  document_number: '12345677',
};

const fiservArgentina3DSVisa: BaseCreditCard = {
  number: '4147463011110083',
  expiration_date: '1229',
  cvv_code: '123',
  cardholder_name: 'John Doe',
  document_number: '12345677',
};

const fiservArgentina3DSAmex: BaseCreditCard = {
  number: '376411234531007',
  expiration_date: '1229',
  cvv_code: '1234',
  cardholder_name: 'John Doe',
  document_number: '12345677',
};

const fiservARVisaSuccessful: BaseCreditCard = {
  number: '4622943127032325',
  expiration_date: '1229',
  cvv_code: '123',
  cardholder_name: 'John Doe',
  document_number: '74857601',
};

const fiservARVisaFailed: BaseCreditCard = {
  number: '4147463011110059',
  expiration_date: '0833',
  cvv_code: '123',
  cardholder_name: 'John Doe',
  document_number: '74857601',
};

export {
  fiservMastercardSuccessful,
  fiservAmexFailed,
  fiserv3DSChallengueWithOutIframe,
  fiserv3DSChallengueWithIframe,
  fiserv3DSFrictionlessWithOutIframe,
  fiserv3DSFrictionlessWithIframe,
  fiservArgentina3DSMastercard,
  fiservArgentina3DSVisa,
  fiservArgentina3DSAmex,
  fiservARVisaSuccessful,
  fiservARVisaFailed,
};
