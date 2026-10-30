import { BaseCreditCard } from './baseCreditCard';

const nuveiMasterCardSucessfull: BaseCreditCard = {
  number: '5101081046006034',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba por Deuna',
  document_number: '12345678',
};

const nuveiVisaSuccessfull: BaseCreditCard = {
  number: '4761344136141390',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba por Deuna',
  document_number: '123456789-1',
};

const nuvei3ds: BaseCreditCard = {
  number: '2221008123677736',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'CL-BRW2 Test',
  document_number: '123456789-1',
};

const nuveiVisaFailed: BaseCreditCard = {
  number: '4000247422310226',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba por Deuna',
  document_number: '12345678-1',
};

export { nuveiMasterCardSucessfull, nuveiVisaSuccessfull, nuvei3ds, nuveiVisaFailed };
