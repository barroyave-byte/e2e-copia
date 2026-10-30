import { BaseCreditCard } from './baseCreditCard';

const dlocalMasterCardSuccessful: BaseCreditCard = {
  number: '5302828051711123',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '12345678',
};

const dlocalDebitCardSuccessful: BaseCreditCard = {
  number: '4012888888881881',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '12345678',
};

const dlocalVisaInstallmentCard: BaseCreditCard = {
  number: '4551101125623406',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '11502184',
};

const dlocalVisaInstallmentCardPE: BaseCreditCard = {
  number: '4009175332806176',
  expiration_date: '1127',
  cvv_code: '1234',
  cardholder_name: 'APRO APRO',
  document_number: '12345678',
};

const dlocalVisaInstallmentCard2: BaseCreditCard = {
  number: '4237715656566544',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '12345678',
};

const dlocalVisaCardSuccessfulUY: BaseCreditCard = {
  number: '4111111111111111',
  expiration_date: '0330',
  cvv_code: '123',
  cardholder_name: 'Jean Roldan',
  document_number: '12345678',
};

const dlocalInvalid: BaseCreditCard = {
  number: '4509953566233704',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'OTHE OTHE',
  document_number: '123456789',
};

const dlocalVisaCardSuccessful: BaseCreditCard = {
  number: '4111111111111111',
  expiration_date: '0330',
  cvv_code: '123',
  cardholder_name: 'Jean Roldan',
  document_number: '123456789',
};

const dlocalVisaCardSuccessfulWithRFC: BaseCreditCard = {
  number: '4111111111111111',
  expiration_date: '0330',
  cvv_code: '123',
  cardholder_name: 'Jean Roldan',
  document_number: 'JBB290119443',
};

const dlocalUnknownCardSuccessful: BaseCreditCard = {
  number: '4043409999991437',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '12345678',
};

const dlocalCodensaCardSuccessful: BaseCreditCard = {
  number: '5907120000000009',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '12345678',
};

export {
  dlocalMasterCardSuccessful,
  dlocalVisaCardSuccessfulWithRFC,
  dlocalVisaInstallmentCard,
  dlocalVisaInstallmentCard2,
  dlocalVisaInstallmentCardPE,
  dlocalDebitCardSuccessful,
  dlocalInvalid,
  dlocalVisaCardSuccessful,
  dlocalUnknownCardSuccessful,
  dlocalCodensaCardSuccessful,
  dlocalVisaCardSuccessfulUY
};
