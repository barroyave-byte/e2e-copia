import { ClickToPayTranslations } from './clickToPayTranlations';

export const screenStartClickToPay: ClickToPayTranslations['screenStartClickToPay'] = {
  accessYourAccountClickToPay: 'Access your Click to Pay account',
  emailLabel: 'Email',
  disclaimerClickToPay:
    'Click to Pay will use this information to verify you, and we may send verification codes to this number.',
  otpUserPageTitle: 'Click to Pay has found your linked cards',
  continueLabel: 'Continue',
  moreInformationLabel: 'More information',
  missingEmailLabel: 'You must accept the Terms and Conditions before continuing.',
};

export const screenAuthFlowClickToPay: ClickToPayTranslations['screenAuthFlowClickToPay'] = {
  cvvRequiredMessage: 'CVV/CVC is not valid.',
  labelEmailChannel: 'Email',
  labelSmsChannel: 'Mobile',
  buttonContinueToAuthFlow: 'Continue',
  labelCvvEmptyError: "Enter your card's CVV number to continue",
};
export const screenNewUserDataSection: ClickToPayTranslations['screenNewUserDataSection'] = {
  userDataTitle: 'Cardholder Information',
  firstNameLabel: 'First Name',
  lastNameLabel: 'Last Name',
};

export const screenPaymentSection: ClickToPayTranslations['screenPaymentSection'] = {
  paymentsTitle: 'Payment Details',
  cardNumberLabel: 'Card number',
  cardHolderLabel: 'Name as it appears on the card',
  expirationDateLabel: 'Expiration date',
  securityCodeLabel: 'CVV',
};

export const screenBillingSection: ClickToPayTranslations['screenBillingSection'] = {
  billingTitle: 'Billing Information',
};

export const clickToPayAgreementSection: ClickToPayTranslations['clickToPayAgreementSection'] = {
  agreementDisclaimer:
    'By continuing, I agree to share my payment information with the payment network to store it in Click to Pay and enable faster online payments.',
};

export const errorMessagesCardForm: ClickToPayTranslations['errorMessagesCardForm'] = {
  cardHolder: 'Please enter first and last name.',
  cardNumber: 'Enter a valid card number.',
  expirationDate: 'Date format MM/YY.',
  securityCode: 'Enter a valid CVV/CVC.',
};
