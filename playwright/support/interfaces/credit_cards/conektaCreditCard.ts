import { BaseCreditCard } from './baseCreditCard';
import { mercadoPagoVisaCardFailed } from '@support/interfaces/credit_cards/mercadopagoCreditCards';

const conektaMasterCardSuccessful: BaseCreditCard = {
  number: '5555555555554444',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Dari Boy',
  document_number: '1234569874',
};

const conektaVisaCardSuccessful: BaseCreditCard = {
  number: '4242424242424242',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Dari Boy',
  document_number: '1234569874',
};

const conektaMasterCardFailed: BaseCreditCard = {
  number: '5201169598806528',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Dari Boy',
  document_number: '1234569874',
};

const conektaFraud: BaseCreditCard = {
  number: '4000000000004954',
  expiration_date: '1127',
  cvv_code: '123',
  cardholder_name: 'Dari Boy',
  document_number: '1234569874',
};

export {
  conektaMasterCardSuccessful,
  conektaVisaCardSuccessful,
  conektaMasterCardFailed,
  conektaFraud,
};
