export interface VoucherProcessorScreen {
  title: string;
  description: string;
  referenceTitle: string;
  referenceTitleForQR?: string;
  waitingConfirmationTitle?: string;
  cancelConfirmationTitle?: string;
  cancelConfirmationDescription?: string;
  cancelConfirmationButton?: string;
  expirationText?: string;
  copyReferenceText?: string;
  additionalInfoDisclaimer?: string;
}

interface NequiPushVoucherScreen {
  sentConfirmationText: string;
}

export interface VoucherTranslations {
  screenBazReferenceProcessor?: VoucherProcessorScreen;
  screenOxxoReferenceProcessor?: VoucherProcessorScreen;
  screenSafetyPayProcessor?: VoucherProcessorScreen;
  screenPixProcessor?: VoucherProcessorScreen;
  screenFemsaOxxoCash?: VoucherProcessorScreen;
  screenNequiPush?: NequiPushVoucherScreen;
}
