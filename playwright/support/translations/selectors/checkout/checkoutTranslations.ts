export interface CheckoutTranslations {
  userFormSelectors: {
    nameAbsenceErrorText: string;
    lastNameAbsenceErrorText: string;
    phoneAbsenceErrorText: string;
    idDocumentAbsenceErrorText: string;
    genericErrorText: string;
    labelInvalidDniErrorMessage: string;
  };
  screenInstallmentsQuantityMSI: {
    buttonInstallmentsMSI: string;
    labelInstallmentsMSI: string;
  };

  loginFormSelectors: {
    enterCodeSent: string;
    labelButtonContinue: string;
    labelReviewYourAddressAndPaymentBeforeBuying: string;
  };
  billingFormSelectors: {
    labelInputAddress: string;
    labelButtonChangeAddress: string;
    labelButtonConfirm: string;
    labelIdentityDocumentError: string;
    labelInputCityAR: string;
    labelZipCodeErrorText: string;
    labelInputErrorText: string;
    labelBillingCancelButton: string;
    labelBillingTitle: string;
    labelAddress: string;
  };
  cardSelectors: {
    cardNumberError: string;
    continueButtonError: string;
    cvvError: string;
    buttonSeeAllMyCards: string;
  };
  otpDinersSelectors: {
    descriptionOTPDiners: string;
    wrongOtpMessage: string;
    buttonGoBackToOrder: string;
  };
  apmRedirectView: {
    labelProcessingPayment: string;
    labelDoNotCloseWindow: string;
    windowClosedWithoutAction: string;
  };
  asaasPixDisclaimer: {
    title: string;
    description: string;
    bullet1: string;
    bullet2: string;
  };
  femsaOxxoCashDisclaimer: {
    title: string;
    description: string;
  };
  screenPaymentWidgetWithCash: {
    payWithCash: string;
  };
  screenPaymentProcessing: {
    labelProcessingOrder: string;
  };
}
