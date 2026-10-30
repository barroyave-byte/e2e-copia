import { MercadoPagoWalletTranslations } from './mercadoPagoWallet';

export const screenMercadoPagoWalletProcessor: MercadoPagoWalletTranslations['screenMercadoPagoWalletProcessor'] =
  {
    labelRedirectingToSite: 'Redirigiendo al sitio.',
    labelWithMercadoPagoAccount: 'Con tu cuenta de Mercado Pago',
    labelWithoutMercadoPagoAccount: 'Sin cuenta de Mercado Pago',
    labelLoginWithAccount: 'Ingresar con mi cuenta',
  };

export const screenMercadoPagoWalletPaymentMethod: MercadoPagoWalletTranslations['screenMercadoPagoWalletPaymentMethod'] =
  {
    titleHowToPay: '¿Cómo quieres pagar?',
    labelCreditCard: 'Crédito',
    labelDebitCard: 'Débito',
    labelAccountBalance: 'Dinero en Mercado Pago',
    labelBankTransfer: 'Transferencia SPEI',
    buttonChangePaymentMethod: 'Pagar con otro medio',
    buttonChooseAnotherPaymentMethod: 'Elegir otro medio de pago',
    labelBNPL: 'Meses sin Tarjeta',
    labelEfecty: 'Efectivo',
    labelBBVA: 'BBVA',
  };

export const screenCardForm: MercadoPagoWalletTranslations['screenCardForm'] = {
  title: 'Completa los datos de tu tarjeta',
};

export const screenMercadoPagoPaymentReview: MercadoPagoWalletTranslations['screenMercadoPagoPaymentReview'] =
  {
    labelCheckYourPayment: 'Revisa tu pago',
    labelPaymentMethod: 'Medio de pago',
    labelRedesignedReview: 'Revisa los datos antes de',
  };

export const screenMercadoPagoThankYouPage: MercadoPagoWalletTranslations['screenMercadoPagoThankYouPage'] =
  {
    labelPaymentSuccessful: '¡Listo! Tu pago ya se acreditó',
    labelPaymentProcessing: 'Estamos procesando tu pago',
    labelPaymentFailed: 'No pudimos procesar tu pago',
    labelPaymentRejection: 'Por motivos de seguridad, tu pago fue rechazado',
    labelFinalizePayment: 'Ahora solo falta finalizar el pago',
    buttonAcknowledge: 'Ok, entendido',
    labelBBVAInstruction:
      'Avisa en la ventanilla del banco que quieres pagar un servicio de Mercado Pago y proporciona estos datos:',
  };

export const screenLogin: MercadoPagoWalletTranslations['screenLogin'] = {
  labelCompleteThisField: 'Completa este dato.',
};
