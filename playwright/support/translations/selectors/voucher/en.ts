import { VoucherTranslations } from './voucherTranslations';

export const screenBazReferenceProcessor: VoucherTranslations['screenBazReferenceProcessor'] = {
  title: 'Pay at any Banco Azteca',
  description: 'Go to the nearest branch and let them know you will make a service payment.',
  referenceTitle: 'PAYMENT REFERENCE',
};

export const screenOxxoReferenceProcessor: VoucherTranslations['screenOxxoReferenceProcessor'] = {
  title: 'Complete your payment at any OXXO',
  description: 'Show the barcode to the OXXO cashier to scan and verify the information',
  referenceTitle: 'PAYMENT REFERENCE',
};

export const screenPixProcessor: VoucherTranslations['screenPixProcessor'] = {
  title: 'Complete your payment',
  description:
    'Open your bank’s app, select the Pix option, and scan or copy the QR code to complete the payment.',
  referenceTitle: 'QR CODE AND PIX CODE',
  referenceTitleForQR: 'QR CODE',
  waitingConfirmationTitle: 'Waiting for confirmation in the app',
  cancelConfirmationTitle: 'Change payment method',
  cancelConfirmationDescription:
    'If you pay with the PIX QR, the purchase will be completed even if you change the payment method.',
  cancelConfirmationButton: 'Change method',
  expirationText: 'Expired',
  copyReferenceText: 'Content copied',
};

export const screenFemsaOxxoCash: VoucherTranslations['screenFemsaOxxoCash'] = {
  title: 'Complete your payment at any OXXO',
  description: 'Show the barcode to the OXXO cashier to scan and verify the information',
  referenceTitle: 'PAYMENT REFERENCE',
  additionalInfoDisclaimer: 'Keep the payment receipt in case you need any support.',
};

export const screenNequiPush: VoucherTranslations['screenNequiPush'] = {
  sentConfirmationText: 'NEQUI will send a notification to:',
};
