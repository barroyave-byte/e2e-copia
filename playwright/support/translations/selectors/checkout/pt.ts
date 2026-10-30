import { CheckoutTranslations } from './checkoutTranslations';

export const userFormSelectors: CheckoutTranslations['userFormSelectors'] = {
  nameAbsenceErrorText:
    'O nome inserido não é válido. Use letras e caracteres permitidos, sem caracteres especiais.',
  lastNameAbsenceErrorText:
    'O sobrenome inserido não é válido. Use letras e caracteres permitidos, sem caracteres especiais.',
  phoneAbsenceErrorText: 'O número de celular não é válido.',
  idDocumentAbsenceErrorText: 'Insira um número de identificação válido.',
  genericErrorText: 'Este campo é obrigatório.',
  labelInvalidDniErrorMessage:
    'Insira o seu número de identificação (Deve conter 10 caracteres). Este campo é obrigatório.',
};

export const screenInstallmentsQuantityMSI: CheckoutTranslations['screenInstallmentsQuantityMSI'] =
  {
    labelInstallmentsMSI: 'de \\$\\d+\\.\\d{2} sem juros',
    buttonInstallmentsMSI: 'Sem parcelas Down',
  };

export const loginFormSelectors: CheckoutTranslations['loginFormSelectors'] = {
  enterCodeSent: 'Digite o código de verificação',
  labelButtonContinue: 'Continuar',
  labelReviewYourAddressAndPaymentBeforeBuying:
    'Certifique-se de verificar seu endereço e forma de pagamento antes de comprar.',
};

export const billingFormSelectors: CheckoutTranslations['billingFormSelectors'] = {
  labelInputAddress: 'Endereço',
  labelButtonChangeAddress: 'Alterar',
  labelButtonConfirm: 'Confirmar',
  labelIdentityDocumentError: 'Número de identidade inválido',
  labelInputCityAR: 'Ciudad Autónoma de Buenos Aires',
  labelZipCodeErrorText: 'Insira um código postal válido.',
  labelInputErrorText: 'Este campo é obrigatório.',
  labelBillingCancelButton: 'Cancelar',
  labelBillingTitle: 'Informações de faturamento',
  labelAddress: 'Endereço de entrega',
};

export const cardSelectors: CheckoutTranslations['cardSelectors'] = {
  cardNumberError: 'Insira um número de cartão válido.',
  continueButtonError: 'Por favor, revise os campos do cartão',
  cvvError: 'CVV/CVC não é válido.',
  buttonSeeAllMyCards: 'Ver cartões salvos',
};

export const otpDinersSelectors: CheckoutTranslations['otpDinersSelectors'] = {
  descriptionOTPDiners:
    'Precisamos validar sua compra. Por favor insira o código que lhe enviaremos.',
  wrongOtpMessage: 'Código incorreto. Por favor, tente novamente.',
  buttonGoBackToOrder: 'Retornar ao seu pedido',
};

export const apmRedirectView: CheckoutTranslations['apmRedirectView'] = {
  labelProcessingPayment: 'Espera enquanto processamos seu pagamento.',
  labelDoNotCloseWindow: 'Nenhuma atualização ou fechamento desta página.',
  windowClosedWithoutAction: 'A janela externa foi fechada sem uma ação anterior.',
};

export const asaasPixDisclaimer: CheckoutTranslations['asaasPixDisclaimer'] = {
  title: 'Opções que se adaptam a você',
  description: 'Ao clicar em “Pagar”, será gerado o código QR.',
  bullet1: 'Use o aplicativo do seu banco copiando o código PIX ou escaneando o QR code.',
  bullet2: 'Confirme os detalhes do pagamento e o valor do seu pedido.',
};

export const femsaOxxoCashDisclaimer: CheckoutTranslations['femsaOxxoCashDisclaimer'] = {
  title: 'Pague em qualquer OXXO',
  description: 'Ao clicar em “Pagar”, sua referência de pagamento será gerada.',
};

export const screenPaymentWidgetWithCash: CheckoutTranslations['screenPaymentWidgetWithCash'] = {
  payWithCash: 'Pagar em Dinheiro',
};

export const screenPaymentProcessing: CheckoutTranslations['screenPaymentProcessing'] = {
  labelProcessingOrder: 'Estamos processando seu pedido',
};
