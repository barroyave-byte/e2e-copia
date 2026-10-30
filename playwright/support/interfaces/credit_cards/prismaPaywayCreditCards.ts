import { BaseCreditCard } from './baseCreditCard';

const prismaPaywayVisaSuccessful: BaseCreditCard = {
  number: '4507990000004905',
  expiration_date: '0830',
  cvv_code: '123',
  cardholder_name: 'Test User',
  document_number: '12345678',
};

const prismaPaywayVisaFailed: BaseCreditCard = {
  number: '4546400044997331',
  expiration_date: '0830',
  cvv_code: '123',
  cardholder_name: 'Test User',
  document_number: '12345678',
};

export { prismaPaywayVisaSuccessful, prismaPaywayVisaFailed };
