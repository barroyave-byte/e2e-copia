import { BaseCreditCard } from './baseCreditCard';

const cieloMasterCardSuccessful: BaseCreditCard = {
  number: '5555555555554444', // - 5517710000001111 // 5454545454545451 // 5555555555554444 //5454545454545454
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Nombre comprador',
  document_number: '54271113107',
};

const cieloVisaSuccessful: BaseCreditCard = {
  number: '4768316074132154',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Travis Holmgren',
  document_number: '54271113107',
};

const cieloAmexSuccessful: BaseCreditCard = {
  number: '340205336647254',
  expiration_date: '1127',
  cvv_code: '1234',
  cardholder_name: 'Alicja Clifton',
  document_number: '54271113107',
};

const cieloDiscoverSuccessful: BaseCreditCard = {
  number: '38584190201144',
  expiration_date: '0428',
  cvv_code: '781',
  cardholder_name: 'Nombre comprador',
  document_number: '54271113107',
};

const cieloMasterCardFailed: BaseCreditCard = {
  number: '5124277427645688',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Juan Callataxi',
  document_number: '54271113107',
};

const cieloRejectedUnauthorized: BaseCreditCard = {
  number: '4417811437318578',
  expiration_date: '0130',
  cvv_code: '123',
  cardholder_name: 'Juan Callataxi',
  document_number: '54271113107',
};

const cieloInvalidYear: BaseCreditCard = {
  number: '4517710000001133',
  expiration_date: '0199',
  cvv_code: '123',
  cardholder_name: 'Juan Callataxi',
  document_number: '54271113107',
};

const cieloInvalidMonth: BaseCreditCard = {
  number: '4768316074132154',
  expiration_date: '0025',
  cvv_code: '123',
  cardholder_name: 'Juan Callataxi',
  document_number: '54271113107',
};

const cieloInvalidCVV: BaseCreditCard = {
  number: '4768316074132154',
  expiration_date: '1127',
  cvv_code: '000', // Currently invalid cvv is not being validated by DEUNA (STG)
  cardholder_name: 'Juan Callataxi',
  document_number: '54271113107',
};

export {
  cieloVisaSuccessful,
  cieloMasterCardSuccessful,
  cieloAmexSuccessful,
  cieloDiscoverSuccessful,
  cieloMasterCardFailed,
  cieloRejectedUnauthorized,
  cieloInvalidYear,
  cieloInvalidMonth,
  cieloInvalidCVV,
};
