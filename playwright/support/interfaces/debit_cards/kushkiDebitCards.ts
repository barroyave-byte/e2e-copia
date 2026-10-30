import { BaseDebitCard } from './baseDebitCard';

const kushkiMastercardVSuccessful: BaseDebitCard = {
  number: '5100270000000023',
  expiration_date: '1130',
  cvv_code: '123',
  cardholder_name: 'CLEAR APPROVED',
  document_number: '11111111',
};

const kushkiVisaSuccessful: BaseDebitCard = {
  number: '4000056655665556', //4000056655665556
  expiration_date: '1130',
  cvv_code: '123',
  cardholder_name: 'CLEAR APPROVED',
  document_number: '11111111',
};

export { kushkiMastercardVSuccessful, kushkiVisaSuccessful };
