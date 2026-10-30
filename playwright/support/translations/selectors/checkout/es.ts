import { CheckoutTranslations } from './checkoutTranslations';

export const userFormSelectors: CheckoutTranslations['userFormSelectors'] = {
  nameAbsenceErrorText:
    'El nombre ingresado no es válido. Utiliza letras y caracteres permitidos, sin caracteres especiales.',
  lastNameAbsenceErrorText:
    'El apellido ingresado no es válido. Utiliza letras y caracteres permitidos, sin caracteres especiales.',
  phoneAbsenceErrorText: 'El número celular no es válido.',
  idDocumentAbsenceErrorText: 'Ingresa un número de identificación válido.',
  genericErrorText: 'Este campo es requerido',
  labelInvalidDniErrorMessage:
    'Ingresa tu número de identificación (Debe contener 10 caracteres). Este campo es obligatorio.',
};

export const screenInstallmentsQuantityMSI: CheckoutTranslations['screenInstallmentsQuantityMSI'] =
  {
    labelInstallmentsMSI: '.*?sin (interés|intereses).*?',
    buttonInstallmentsMSI: 'Sin cuotas Down',
  };

export const loginFormSelectors: CheckoutTranslations['loginFormSelectors'] = {
  enterCodeSent: 'Ingresa el código enviado a tu teléfono',
  labelButtonContinue: 'Continuar',
  labelReviewYourAddressAndPaymentBeforeBuying:
    'Asegúrate de revisar tu dirección y forma de pago antes de comprar.',
};

export const billingFormSelectors: CheckoutTranslations['billingFormSelectors'] = {
  labelInputAddress: 'Dirección',
  labelButtonChangeAddress: 'Cambiar',
  labelButtonConfirm: 'Confirmar',
  labelIdentityDocumentError: 'Número de cédula inválido',
  labelInputCityAR: 'Ciudad Autónoma de Buenos Aires',
  labelZipCodeErrorText: 'Ingresa un código postal válido.',
  labelInputErrorText: 'Este campo es obligatorio.',
  labelBillingCancelButton: 'Cancelar',
  labelBillingTitle: 'Datos de facturación',
  labelAddress: 'Dirección de entrega',
};

export const cardSelectors: CheckoutTranslations['cardSelectors'] = {
  cardNumberError: 'El número de la tarjeta no es válido.',
  continueButtonError: 'Por favor revisa los campos de la tarjeta',
  cvvError: 'CVV/CVC no es válido.',
  buttonSeeAllMyCards: 'Ver tarjetas guardadas',
};

export const otpDinersSelectors: CheckoutTranslations['otpDinersSelectors'] = {
  descriptionOTPDiners:
    'Necesitamos validar tu compra. Por favor ingresa el código que te enviaremos.',
  wrongOtpMessage: 'Código incorrecto. Por favor intenta de nuevo.',
  buttonGoBackToOrder: 'Volver a tu orden',
};

export const apmRedirectView: CheckoutTranslations['apmRedirectView'] = {
  labelProcessingPayment: 'Espera mientras procesamos tu pago.',
  labelDoNotCloseWindow: 'No actualices ni cierres esta página.',
  windowClosedWithoutAction: 'La ventana externa ha sido cerrada sin previa acción.',
};

export const asaasPixDisclaimer: CheckoutTranslations['asaasPixDisclaimer'] = {
  title: 'Opciones que se adaptan a ti',
  description: 'Al hacer clic en “Pagar”, se generará el código QR.',
  bullet1: 'Usa la aplicación de tu banco copiando el código PIX o escaneando el código QR.',
  bullet2: 'Confirma los detalles del pago y el monto de tu pedido.',
};

export const femsaOxxoCashDisclaimer: CheckoutTranslations['femsaOxxoCashDisclaimer'] = {
  title: 'Paga en cualquier OXXO',
  description: 'Al hacer clic en “Pagar”, se generará tu referencia de pago.',
};

export const screenPaymentWidgetWithCash: CheckoutTranslations['screenPaymentWidgetWithCash'] = {
  payWithCash: 'Paga con Efectivo',
};

export const screenPaymentProcessing: CheckoutTranslations['screenPaymentProcessing'] = {
  labelProcessingOrder: 'Estamos procesando tu orden',
};
