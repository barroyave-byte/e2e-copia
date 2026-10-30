export interface MercadoPagoWalletTranslations {
  screenMercadoPagoWalletProcessor: {
    labelRedirectingToSite: string;
    labelWithMercadoPagoAccount: string;
    labelWithoutMercadoPagoAccount: string;
    labelLoginWithAccount: string;
  };

  screenMercadoPagoWalletPaymentMethod: {
    titleHowToPay: string;
    labelCreditCard: string;
    labelDebitCard: string;
    labelAccountBalance: string;
    labelBankTransfer: string;
    labelBNPL: string;
    labelEfecty: string;
    buttonChangePaymentMethod: string;
    buttonChooseAnotherPaymentMethod: string;
    labelBBVA: string;
  };

  screenCardForm: {
    title: string;
  };

  screenLogin: {
    labelCompleteThisField: string;
  };

  screenMercadoPagoPaymentReview: {
    labelCheckYourPayment: string;
    labelPaymentMethod: string;
    /**
     * Shared prefix of the review screen in MP's redesigned checkout ("... antes de pagar" for
     * cards, "... antes de generar el código de pago" for SPEI). Only set where it was observed.
     */
    labelRedesignedReview?: string;
  };

  screenMercadoPagoThankYouPage: {
    labelPaymentSuccessful: string;
    labelPaymentProcessing: string;
    labelPaymentFailed: string;
    labelFinalizePayment: string;
    labelPaymentRejection: string;
    buttonAcknowledge: string;
    labelBBVAInstruction: string;
  };
}
