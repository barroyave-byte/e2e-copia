import { VaultTranslations } from './vaultTranslations';

export const screenVaultWidgetPage: VaultTranslations['screenVaultWidgetPage'] = {
  labelInstallmentsMSI: 'of \\$\\d+\\.\\d{2} without interest',
  buttonInstallmentsMSI: 'No Down Installments',
  titleMainView: 'Pay with credit or debit card',
  buttonAddNewCard: 'Add new card',
  labelLoadingInstallments: 'Validating installments...',
  labelInvalidCardHolder: 'Please enter first name and last name.',
  labelCardIdentityDocument: 'RFC number',
  buttonBackToCardForm: 'Cancel',
  buttonSaveBillingForm: 'Save',
};

export const screenErrorView: VaultTranslations['screenErrorView'] = {
  labelErrorViewTitle: 'Something went wrong!',
  labelErrorViewDescription:
    'We couldn’t process your payment with the card you entered. Please try again.',
};

export const screenBillingData: VaultTranslations['screenBillingData'] = {
  title: 'Billing Data',
  formSaveButton: 'Save',
  addBillingData: 'Add Billing Data',
  phoneInputAriaLabel: 'Please enter a phone number',
};
