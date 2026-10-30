import { BaseCreditCard } from './baseCreditCard';

export const globalpayVisaSuccessful: BaseCreditCard = {
  number: '4111111111111111',
  expiration_date: '1228',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '67629145276',
};

export const globalPayVisaWithInstallments: BaseCreditCard = {
  number: '4912845716481111',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Prueba Deuna',
  document_number: '162915134',
};

export const globalpay3DS: BaseCreditCard = {
  number: '4000020951595032',
  expiration_date: '0528',
  cvv_code: '123',
  cardholder_name: 'Philip Marlowe',
  document_number: '67629145276',
};

export const globalpayVisaFailed: BaseCreditCard = {
  number: '4242424242424242',
  expiration_date: '1228',
  cvv_code: '123',
  cardholder_name: 'APRO APRO',
  document_number: '67629145276',
};
