import { BaseCreditCard } from './baseCreditCard';

const amexSuccessful: BaseCreditCard = {
  number: '371449635398431',
  expiration_date: '0139',
  cvv_code: '0000',
  cardholder_name: 'QA TEST',
  document_number: '1315722768',
};

const amex3DS: BaseCreditCard = {
  number: '340000099900051',
  expiration_date: '0139',
  cvv_code: '0000',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722768',
};

const amexSuccessfulMSI: BaseCreditCard = {
  number: '378282246310005', //5333527145351713 // 378282246310005 //340205946510454
  expiration_date: '0139',
  cvv_code: '0000',
  cardholder_name: 'Prueba Deuna',
  document_number: '1315722768',
};

export { amexSuccessful, amex3DS, amexSuccessfulMSI };
