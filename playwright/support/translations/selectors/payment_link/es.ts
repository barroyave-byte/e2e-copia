import { PaymentLinkTranslations } from './paymentLinkTranslations';

export const screenBillingData: PaymentLinkTranslations['screenBillingData'] = {
  checkboxLabel: 'Facturar con los mismos datos',
  formTitle: 'Ingresa tus datos de facturación',
  formSaveButton: 'Guardar',
  addBillingData: 'Agregar datos',
  phoneInputAriaLabel: 'Please enter a phone number',
};

export const screenMainView: PaymentLinkTranslations['screenMainView'] = {
  cardFormTitle: 'Ingresa los datos de tu tarjeta',
  billingFormTitle: 'Datos de facturación',
  orderDetailsTitle: 'Tu orden',
};

export const screenPaymentLinkPaymentForm: PaymentLinkTranslations['screenPaymentLinkPaymentForm'] =
  {
    saveCardsLabel: 'Guardar la información de mi tarjeta para futuras compras.',
  };

export const screenInstallmentsQuantityMSI: PaymentLinkTranslations['screenInstallmentsQuantityMSI'] =
  {
    labelInstallmentsMSI: '.*?sin (interés|intereses).*?',
    buttonInstallmentsMSI: 'Sin cuotas Down',
  };

export const screenPaymentLinkUserInfo: PaymentLinkTranslations['screenPaymentLinkUserInfo'] = {
  subtotal: 'Subtotal',
  termsAndConditions: 'Términos y condiciones',
};

export const screenPseFormPage: PaymentLinkTranslations['screenPseFormPage'] = {
  labelNaturalPersonOption: 'Natural',
};

export const screenPaymentLinkPaymentFormDenied: PaymentLinkTranslations['screenPaymentLinkPaymentFormDenied'] =
  {
    linkIsnotAvailable: 'Enlace no disponible',
    pleaseCheckOrderStatus: 'Por favor, comprueba el estado de tu orden o inténtalo de nuevo.',
  };
