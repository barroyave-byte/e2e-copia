import { MercadoPagoWalletTranslations } from './mercadoPagoWallet';

export const screenMercadoPagoWalletProcessor: MercadoPagoWalletTranslations['screenMercadoPagoWalletProcessor'] =
  {
    labelRedirectingToSite: 'Redirecting to the site',
    labelWithMercadoPagoAccount: 'With your Mercado Pago account',
    labelWithoutMercadoPagoAccount: 'Without a Mercado Pago account',
    labelLoginWithAccount: 'Log in with my account',
  };

export const screenMercadoPagoWalletPaymentMethod: MercadoPagoWalletTranslations['screenMercadoPagoWalletPaymentMethod'] =
  {
    titleHowToPay: 'How do you want to pay?',
    labelCreditCard: 'Credit card',
    labelDebitCard: 'Debit card',
    labelAccountBalance: 'Account balance',
    labelBankTransfer: 'Bank transfer',
    buttonChangePaymentMethod: 'Pay with another method',
    buttonChooseAnotherPaymentMethod: 'Choose another payment method',
    labelBNPL: 'Months without card',
    labelEfecty: 'Efecty',
    labelBBVA: 'BBVA',
  };

export const screenCardForm: MercadoPagoWalletTranslations['screenCardForm'] = {
  title: 'Complete your card details',
};

export const screenMercadoPagoPaymentReview: MercadoPagoWalletTranslations['screenMercadoPagoPaymentReview'] =
  {
    labelCheckYourPayment: 'Review your payment',
    labelPaymentMethod: 'Payment method',
  };

export const screenMercadoPagoThankYouPage: MercadoPagoWalletTranslations['screenMercadoPagoThankYouPage'] =
  {
    labelPaymentSuccessful: 'Done! Your payment has been approved',
    labelPaymentProcessing: 'We are processing your payment',
    labelPaymentFailed: 'We could not process your payment',
    labelPaymentRejection: 'For security reasons, your payment was declined',
    labelFinalizePayment: 'Now just need to finalize the payment',
    buttonAcknowledge: 'Ok, understood',
    labelBBVAInstruction:
      'Tell the bank clerk that you want to pay a Mercado Pago service and provide these details:',
  };

export const screenLogin: MercadoPagoWalletTranslations['screenLogin'] = {
  labelCompleteThisField: 'Complete this field.',
};
