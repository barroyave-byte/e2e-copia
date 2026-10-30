import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';
import { BaseCreditCard } from './baseCreditCard';

const kushkiMasterCardExitosa: BaseCreditCard = {
  number: '5451951574925480', //5451951574925480 // 5101081046006034 //5100270000000023 //5288775404117508
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba por Deuna',
  document_number: IDENTITY_DOCUMENTS.MX.RFC,
};

const kushkiVisaSuccessfull: BaseCreditCard = {
  number: '4168818844447115',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba por Deuna',
  document_number: IDENTITY_DOCUMENTS.MX.RFC,
};

const kushkiVisaMSI: BaseCreditCard = {
  number: '4772124136141390',
  expiration_date: '1230',
  cvv_code: '777',
  cardholder_name: 'APPROVED APPROVED',
  document_number: '11111111',
};

const kushki3ds: BaseCreditCard = {
  number: '4456529267234200',
  expiration_date: '0328',
  cvv_code: '075',
  cardholder_name: 'APRO APRO',
  document_number: '12345678',
};

const kushkiVisaFailed: BaseCreditCard = {
  number: '4349003000047015', // 4574441215190335
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba por Deuna',
  document_number: '12345678',
};

const kushkiVisaInvalidCard: BaseCreditCard = {
  number: '4349008516656431',
  expiration_date: '0229',
  cvv_code: '123',
  cardholder_name: 'Prueba de fondos insuficientes',
  document_number: '12345678',
};

const kushkiMasterCardDebit: BaseCreditCard = {
  number: '5100270000000023',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'CLEAR APRO',
  document_number: '10366574567',
};

const kushkiVisaInvalidTokenization: BaseCreditCard = {
  number: '4574441215190335',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Error en tokenizacion',
  document_number: '10366574567',
};

const kushki3dsMastercard: BaseCreditCard = {
  number: '5100270000000023',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba por Deuna',
  document_number: '12345678',
};

export {
  kushkiMasterCardExitosa,
  kushkiVisaSuccessfull,
  kushki3ds,
  kushkiVisaFailed,
  kushkiVisaMSI,
  kushkiVisaInvalidCard,
  kushkiMasterCardDebit,
  kushkiVisaInvalidTokenization,
  kushki3dsMastercard,
};
