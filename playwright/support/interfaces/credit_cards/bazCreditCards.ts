import { BaseCreditCard } from './baseCreditCard';

const bazVisaCardSuccessful: BaseCreditCard = {
  number: '4152313289903408',
  expiration_date: '0330',
  cvv_code: '737',
  cardholder_name: 'John Doe',
  document_number: '23100299900',
};

const bazMastercardSuccessful: BaseCreditCard = {
  number: '5471300000000003',
  expiration_date: '0330',
  cvv_code: '737',
  cardholder_name: 'John Doe',
  document_number: '23100299900',
};

export { bazVisaCardSuccessful, bazMastercardSuccessful };
