import { PaymentLinkTranslations } from './paymentLinkTranslations';

export const screenBillingData: PaymentLinkTranslations['screenBillingData'] = {
  checkboxLabel: 'Bill with the same data',
  formTitle: 'Enter your billing information',
  formSaveButton: 'Save',
  addBillingData: 'Add data',
  phoneInputAriaLabel: 'Please enter a phone number',
};

export const screenMainView: PaymentLinkTranslations['screenMainView'] = {
  cardFormTitle: 'Enter your card details',
  billingFormTitle: 'Billing information',
  orderDetailsTitle: 'Your order',
};

export const screenPaymentLinkPaymentForm: PaymentLinkTranslations['screenPaymentLinkPaymentForm'] =
  {
    saveCardsLabel: 'Save my card information for future purchases.',
  };

export const screenInstallmentsQuantityMSI: PaymentLinkTranslations['screenInstallmentsQuantityMSI'] =
  {
    labelInstallmentsMSI: 'of \\$\\d+\\.\\d{2} without interest',
    buttonInstallmentsMSI: 'No fees Down',
  };

export const screenPaymentLinkUserInfo: PaymentLinkTranslations['screenPaymentLinkUserInfo'] = {
  subtotal: 'Subtotal',
  termsAndConditions: 'Terms and conditions',
};

export const screenPseFormPage: PaymentLinkTranslations['screenPseFormPage'] = {
  labelNaturalPersonOption: 'Natural',
};

export const screenPaymentLinkPaymentFormDenied: PaymentLinkTranslations['screenPaymentLinkPaymentFormDenied'] =
  {
    linkIsnotAvailable: 'link not available',
    pleaseCheckOrderStatus: 'please check the status of your order or try again.',
  };
