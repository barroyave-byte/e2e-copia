export interface ClickToPayTranslations {
  screenStartClickToPay: {
    accessYourAccountClickToPay: string;
    emailLabel: string;
    disclaimerClickToPay: string;
    otpUserPageTitle: string;
    continueLabel: string;
    moreInformationLabel: string;
    missingEmailLabel: string;
  };
  screenAuthFlowClickToPay: {
    cvvRequiredMessage: string;
    labelEmailChannel: string;
    labelSmsChannel: string;
    buttonContinueToAuthFlow: string;
    labelCvvEmptyError: string;
  };

  screenNewUserDataSection: {
    userDataTitle: string;
    firstNameLabel: string;
    lastNameLabel: string;
  };
  screenPaymentSection: {
    paymentsTitle: string;
    cardNumberLabel: string;
    cardHolderLabel: string;
    expirationDateLabel: string;
    securityCodeLabel: string;
  };
  screenBillingSection: {
    billingTitle: string;
  };
  clickToPayAgreementSection: {
    agreementDisclaimer: string;
  };
  errorMessagesCardForm: {
    cardNumber: string;
    expirationDate: string;
    securityCode: string;
    cardHolder: string;
  };
}
