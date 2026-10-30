import { BaseCreditCard } from './baseCreditCard';

// Reference URL for test cards: https://developer.mastercard.com/unified-checkout-solutions/documentation/testing/test_cases/click_to_pay_case/#test-cards
export const clickToPayMastercardSuccess: BaseCreditCard = {
  number: '5186001700008785',
  expiration_date: '1230',
  cvv_code: '123',
  cardholder_name: 'John Doe',
  document_number: '1234569874',
};
