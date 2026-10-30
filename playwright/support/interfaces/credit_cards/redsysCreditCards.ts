import { BaseCreditCard } from './baseCreditCard';

const redsysCreditCardFrictionless: BaseCreditCard = {
  number: '4918019160034602',
  expiration_date: '1234',
  cvv_code: '123',
  cardholder_name: 'Prueba por Deuna',
  document_number: '12345678Z',
};

const redsysCreditCardChallenge: BaseCreditCard = {
  number: '4918019199883839',
  expiration_date: '1234',
  cvv_code: '123',
  cardholder_name: 'Prueba por Deuna',
  document_number: '12345678Z',
};

export { redsysCreditCardFrictionless, redsysCreditCardChallenge };
