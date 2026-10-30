import { DeunanowTranslations } from './deunanowTranslations';

export const screenInstallmentsQuantityMSI: DeunanowTranslations['screenInstallmentsQuantityMSI'] =
{
  labelInstallmentsMSI: 'of \\$\\d+\\.\\d{2} without interest',
  buttonInstallmentsMSI: 'No Down Installments',
};

export const screenInstallmentsQuantityMCI: DeunanowTranslations['screenInstallmentsQuantityMCI'] =
{
  labelInstallmentsMCI: 'of \\$\\d+\\.\\d{2} with interest of \\d+\\.\\d{2}%',
  buttonInstallmentsMCI: 'No Down Installments',
};

export const screenPaymentLinkUserInfo: DeunanowTranslations['screenPaymentLinkUserInfo'] = {
  cardErrorMessage: 'Please enter all your card details.',
  expDateErrorMessage: 'The card has expired.',
  cvvErrorMessage: 'Enter a valid CVV/CVC.',
  cardHolderErrorMessage: 'Avoid accents or special characters (á,@,#,ñ).',
  cardHolderMissingLastNameErrorMessage: 'Please enter your name and last name.',
  idDocumentErrorMessage: 'Please enter a valid identity document.',
  subtotal: 'Subtotal',
  termsAndConditions: 'Terms and conditions',
  cardFieldsErrorMessage: 'Please enter all your card details.',
};

export const screenRedirectToCommerceView: DeunanowTranslations['screenRedirectToCommerceView'] = {
  labelOrderCancelled: 'Your order has already been cancelled',
  labelPaymentCancelled: 'Your payment has already been cancelled',
  labelProcessingPayment: 'Your payment is already being processed',
  labelProcessingOrder: 'We are processing your order',
};

export const screenThankYouPage: DeunanowTranslations['screenThankYouPage'] = {
  labelSuccessfulTitle: 'Payment completed',
  labelPaymentNumber: 'Payment Number',
  labelTransactionNumber: 'DEUNA Transaction Number',
};

export const screenBillingData: DeunanowTranslations['screenBillingData'] = {
  checkboxLabel: 'Bill with the same data',
  titleBillingView: 'Enter your billing information',
  buttonFormSave: 'Save',
  addBillingData: 'Add data',
  changeBillingData: 'Change',
  buttonFormCancel: 'Cancel',
  descriptionInputRequired: 'This field is required.',
};

export const screenPaymentLinkPaymentForm: DeunanowTranslations['screenPaymentLinkPaymentForm'] = {
  saveCardsLabel: 'Save my card information for future purchases.',
  title: 'Pay with credit or debit card',
  description: 'Please enter your card details',
  payWith: 'Pay with',
  privacyPolicy: 'Privacy Policy',
  termsAndConditions: 'Terms and conditions',
};

export const screenAlertNotifications: DeunanowTranslations['screenAlertNotifications'] = {
  missingBillingData: 'Enter billing data to continue.',
  selectInstallments: 'Please select the installments that apply to your transaction.',
  purchaseError: "We're sorry, we had a problem processing your payment. Please try again.",
  widgetPurchaseError: 'We had a problem processing your payment. Please try again.',
  somethingWentWrong: "Something went wrong. Please try again.",
  accountConfigurationError: "We couldn't set up your account. Please try again."
};

export const screenExpiryDateField: DeunanowTranslations['screenExpiryDateField'] = {
  invalidFormat: 'Date format MM/YY.',
  invalidMonth: 'The month must be between 01 and 12.',
  cardExpired: 'The card has expired.',
};

export const screenMainPage: DeunanowTranslations['screenMainPage'] = {
  buttonPay: 'Pay',
};

export const screenOrderSummaryDeunaNow: DeunanowTranslations['screenOrderSummaryDeunaNow'] = {
  labelPendingPayment: '',
  buttonBackToHome: '',
};

export const screenTransactionViewResult: DeunanowTranslations['screenTransactionViewResult'] = {
  labelDeniedTitle: 'Payment declined',
  labelDeniedMainMessage: 'We could not process your transaction. Please check your details and try again.',
};

export const screenDeleteCard: DeunanowTranslations['screenDeleteCard'] = {
  deleteOption: 'Delete',
  confirmButton: 'Confirm',
};
