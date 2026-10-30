import { CheckoutTranslations } from './checkoutTranslations';

export const userFormSelectors: CheckoutTranslations['userFormSelectors'] = {
  nameAbsenceErrorText: '',
  lastNameAbsenceErrorText: '',
  phoneAbsenceErrorText: '',
  idDocumentAbsenceErrorText: '',
  genericErrorText: '',
  labelInvalidDniErrorMessage: '',
};

export const screenInstallmentsQuantityMSI: CheckoutTranslations['screenInstallmentsQuantityMSI'] =
  {
    labelInstallmentsMSI: '',
    buttonInstallmentsMSI: '',
  };

export const loginFormSelectors: CheckoutTranslations['loginFormSelectors'] = {
  enterCodeSent: '',
  labelButtonContinue: 'Continue',
  labelReviewYourAddressAndPaymentBeforeBuying:
    'Make sure to review your address and payment method before purchasing.',
};

export const billingFormSelectors: CheckoutTranslations['billingFormSelectors'] = {
  labelInputAddress: 'Address',
  labelButtonChangeAddress: 'Change',
  labelButtonConfirm: 'Confirm',
  labelIdentityDocumentError: 'Invalid identity document number',
  labelInputCityAR: 'Ciudad Autónoma de Buenos Aires',
  labelZipCodeErrorText: 'Enter a valid zip code.',
  labelInputErrorText: 'This field is required.',
  labelBillingCancelButton: 'Cancel',
  labelBillingTitle: 'Billing information',
  labelAddress: 'Delivery address',
};

export const cardSelectors: CheckoutTranslations['cardSelectors'] = {
  cardNumberError: 'Enter a valid card number.',
  continueButtonError: 'Please review the card fields',
  cvvError: 'CVV/CVC is not valid.',
  buttonSeeAllMyCards: 'View saved cards',
};

export const otpDinersSelectors: CheckoutTranslations['otpDinersSelectors'] = {
  descriptionOTPDiners:
    'We need to validate your purchase. Please enter the code we will send you.',
  wrongOtpMessage: 'Incorrect code. Please try again.',
  buttonGoBackToOrder: 'Return to your order',
};

export const apmRedirectView: CheckoutTranslations['apmRedirectView'] = {
  labelProcessingPayment: 'Waiting while processing your payment.',
  labelDoNotCloseWindow: "Don't refresh or close this page.",
  windowClosedWithoutAction: 'The external window was closed without any action.',
};

export const asaasPixDisclaimer: CheckoutTranslations['asaasPixDisclaimer'] = {
  title: 'Options that suit you',
  description: 'By clicking “Pay”, the QR code will be generated.',
  bullet1: 'Use your bank’s app by copying the PIX code or scanning the QR code.',
  bullet2: 'Confirm the payment details and the order amount.',
};

export const femsaOxxoCashDisclaimer: CheckoutTranslations['femsaOxxoCashDisclaimer'] = {
  title: 'Pay at any OXXO',
  description: 'When you click “Pay”, your payment reference will be generated.',
};

export const screenPaymentWidgetWithCash: CheckoutTranslations['screenPaymentWidgetWithCash'] = {
  payWithCash: 'Pay with Cash',
};

export const screenPaymentProcessing: CheckoutTranslations['screenPaymentProcessing'] = {
  labelProcessingOrder: 'We are processing your order',
};
