import { DeunanowTranslations } from './deunanowTranslations';

export const screenInstallmentsQuantityMSI: DeunanowTranslations['screenInstallmentsQuantityMSI'] =
{
  labelInstallmentsMSI: '.*?sin (interés|intereses).*?',
  buttonInstallmentsMSI: 'Sin cuotas Down',
};

export const screenInstallmentsQuantityMCI: DeunanowTranslations['screenInstallmentsQuantityMCI'] =
{
  labelInstallmentsMCI: 'de \\$\\d+\\.\\d{2} con interés del \\d+\\.\\d{2}%',
  buttonInstallmentsMCI: 'Sin cuotas Down',
};

export const screenPaymentLinkUserInfo: DeunanowTranslations['screenPaymentLinkUserInfo'] = {
  cardErrorMessage: 'Por favor ingresa todos los datos de tu tarjeta.',
  expDateErrorMessage: 'La tarjeta ha expirado.',
  cvvErrorMessage: 'Ingresa un CVV/CVC válido.',
  cardHolderErrorMessage: 'Evita tildes o caracteres especiales (á,@,#,ñ).',
  cardHolderMissingLastNameErrorMessage: 'Por favor, ingresa nombre y apellido.',
  idDocumentErrorMessage: 'Ingresa un documento de identidad válido.',
  subtotal: 'Subtotal',
  termsAndConditions: 'Términos y condiciones',
  cardFieldsErrorMessage: 'Por favor ingresa todos los datos de tu tarjeta..',
};

export const screenRedirectToCommerceView: DeunanowTranslations['screenRedirectToCommerceView'] = {
  labelOrderCancelled: 'Su orden ya fue cancelada',
  labelPaymentCancelled: 'Su pago ya fue cancelado',
  labelProcessingPayment: 'Su pago ya está siendo procesado',
  labelProcessingOrder: 'Estamos procesando tu orden',
};

export const screenThankYouPage: DeunanowTranslations['screenThankYouPage'] = {
  labelSuccessfulTitle: 'Pago completado',
  labelPaymentNumber: 'Número de pago',
  labelTransactionNumber: 'Número de transacción DEUNA',
};

export const screenBillingData: DeunanowTranslations['screenBillingData'] = {
  checkboxLabel: 'Facturar con los mismos datos',
  titleBillingView: 'Ingresa tus datos de facturación',
  buttonFormSave: 'Guardar',
  addBillingData: 'Agregar datos',
  changeBillingData: 'Cambiar',
  buttonFormCancel: 'Cancelar',
  descriptionInputRequired: 'Este campo es obligatorio.',
};

export const screenPaymentLinkPaymentForm: DeunanowTranslations['screenPaymentLinkPaymentForm'] = {
  saveCardsLabel: 'Guardar la información de mi tarjeta para futuras compras.',
  title: 'Paga con tarjeta crédito o débito',
  description: 'Por favor, ingresa los datos de tu tarjeta',
  payWith: 'Paga con',
  privacyPolicy: 'Políticas de privacidad',
  termsAndConditions: 'Términos y condiciones de DEUNA',
};

export const screenAlertNotifications: DeunanowTranslations['screenAlertNotifications'] = {
  missingBillingData: 'Ingresa datos de facturación para continuar.',
  selectInstallments: 'Por favor, selecciona las cuotas correspondientes a tu transacción.',
  purchaseError:
    'Lo sentimos, tuvimos un problema al intentar procesar tu pago, inténtalo nuevamente.',
  widgetPurchaseError: 'Tuvimos un problema al procesar tu pago. Inténtalo nuevamente.',
  somethingWentWrong: "Algo salió mal. Por favor, inténtalo de nuevo.",
  accountConfigurationError: 'No pudimos configurar tu cuenta. Intenta nuevamente.'
};

export const screenExpiryDateField: DeunanowTranslations['screenExpiryDateField'] = {
  invalidFormat: 'Formato de fecha MM/AA.',
  invalidMonth: 'El mes debe estar entre 01 y 12.',
  cardExpired: 'La tarjeta ha expirado.',
};

export const screenMainPage: DeunanowTranslations['screenMainPage'] = {
  buttonPay: 'Pagar',
};

export const screenOrderSummaryDeunaNow: DeunanowTranslations['screenOrderSummaryDeunaNow'] = {
  labelPendingPayment: 'Pago pendiente',
  buttonBackToHome: 'Volver al inicio',
};

export const screenTransactionViewResult: DeunanowTranslations['screenTransactionViewResult'] = {
  labelDeniedTitle: 'Pago rechazado',
  labelDeniedMainMessage: 'No pudimos procesar tu transacción. Revisa los datos ingresados e intentarlo de nuevo.',
};

export const screenDeleteCard: DeunanowTranslations['screenDeleteCard'] = {
  deleteOption: 'Eliminar',
  confirmButton: 'Confirmar',
};
