import { BaseCreditCard } from './baseCreditCard';

const redeAmexSuccessful: BaseCreditCard = {
  number: '4235647728025682',
  expiration_date: '0135',
  cvv_code: '123',
  cardholder_name: 'Nombre comprador',
  document_number: '51682247503',
};

const redeDinersSuccessful: BaseCreditCard = {
  number: '36490101441625',
  expiration_date: '0135',
  cvv_code: '123',
  cardholder_name: 'Nombre comprador',
  document_number: '51682247503',
};

const redeMasterCardSuccessful: BaseCreditCard = {
  number: '5448280000000007',
  expiration_date: '0135',
  cvv_code: '123',
  cardholder_name: 'Nombre comprador',
  document_number: '51682247503',
};

const redeVisaSuccessful: BaseCreditCard = {
  number: '4235647728025682',
  expiration_date: '0135',
  cvv_code: '123',
  cardholder_name: 'Nombre comprador',
  document_number: '51682247503',
};

const redeMasterCardFailed: BaseCreditCard = {
  number: '4895370010000000',
  expiration_date: '0135',
  cvv_code: '123',
  cardholder_name: 'Juan Callataxi',
  document_number: '51682247503',
};

const redeRejectedUnauthorized: BaseCreditCard = {
  number: '4168818844447115',
  expiration_date: '0139',
  cvv_code: '0000',
  cardholder_name: 'Juan Callataxi',
  document_number: '51682247503',
};

export {
  redeVisaSuccessful,
  redeMasterCardFailed,
  redeRejectedUnauthorized,
  redeAmexSuccessful,
  redeMasterCardSuccessful,
  redeDinersSuccessful,
};
