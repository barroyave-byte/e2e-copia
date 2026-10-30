import { BaseCreditCard } from './baseCreditCard';

const placetopayVisaSuccessful: BaseCreditCard = {
  number: '4110760000000081',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '162915134',
};

const placetopayVisaDenied: BaseCreditCard = {
  number: '4110760000000016',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '162915134',
};

const placetopayDinersSuccessful: BaseCreditCard = {
  number: '36545400000008',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '162915134',
};

const placetopay3ds: BaseCreditCard = {
  number: '5180300000000047',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Sebas Catalan',
  document_number: '162915134',
};

const placetopay3dsFrictionless: BaseCreditCard = {
  number: '5180300000000005',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Sebas Catalan',
  document_number: '162915134',
};

const placetopay3dsDenied: BaseCreditCard = {
  number: '376651792202224',
  expiration_date: '1127',
  cvv_code: '1234',
  cardholder_name: 'Sebas Catalan',
  document_number: '162915134',
};

export {
  placetopayVisaDenied,
  placetopayVisaSuccessful,
  placetopay3ds,
  placetopay3dsFrictionless,
  placetopay3dsDenied,
  placetopayDinersSuccessful,
};
