import { ClickToPayTranslations } from './clickToPayTranlations';

export const screenStartClickToPay: ClickToPayTranslations['screenStartClickToPay'] = {
  accessYourAccountClickToPay: 'Accede a tu cuenta Click to Pay',
  emailLabel: 'Correo electrónico',
  disclaimerClickToPay:
    'Click to Pay usará esta información para verificarte y es posible que enviemos códigos de verificación a este número.',
  otpUserPageTitle: 'Click to Pay ha encontrado tus tarjetas vinculadas',
  moreInformationLabel: 'Más información',
  continueLabel: 'Continuar',
  missingEmailLabel: 'Por favor ingresa un correo electrónico válido.',
};
export const screenAuthFlowClickToPay: ClickToPayTranslations['screenAuthFlowClickToPay'] = {
  cvvRequiredMessage: 'CVV/CVC no es válido.',
  labelEmailChannel: 'Correo electrónico',
  labelSmsChannel: 'Móvil',
  buttonContinueToAuthFlow: 'Continuar',
  labelCvvEmptyError: 'Ingresa el número de CVV de tu tarjeta para continuar.',
};

export const screenNewUserDataSection: ClickToPayTranslations['screenNewUserDataSection'] = {
  userDataTitle: 'Datos del Tarjetahabiente',
  firstNameLabel: 'Nombre',
  lastNameLabel: 'Apellido',
};

export const screenPaymentSection: ClickToPayTranslations['screenPaymentSection'] = {
  paymentsTitle: 'Detalles de Pago',
  cardNumberLabel: 'Número de tarjeta',
  cardHolderLabel: 'Nombre como aparece en la tarjeta',
  expirationDateLabel: 'Fecha expiración',
  securityCodeLabel: 'CVV',
};

export const screenBillingSection: ClickToPayTranslations['screenBillingSection'] = {
  billingTitle: 'Datos de facturación',
};

export const clickToPayAgreementSection: ClickToPayTranslations['clickToPayAgreementSection'] = {
  agreementDisclaimer:
    'Al continuar acepto compartir mi información de pago con la red de pagos para guardarlas en Click to Pay y poder realizar pagos online más rápidos.',
};

export const errorMessagesCardForm: ClickToPayTranslations['errorMessagesCardForm'] = {
  cardHolder: 'Por favor, ingresa nombre y apellido.',
  cardNumber: 'Ingresa un número de tarjeta válido.',
  expirationDate: 'Formato de fecha MM/AA.',
  securityCode: 'Ingresa un CVV/CVC válido.',
};
