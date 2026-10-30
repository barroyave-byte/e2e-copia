import { ClickToPayTranslations } from './clickToPayTranlations';

export const screenStartClickToPay: ClickToPayTranslations['screenStartClickToPay'] = {
  accessYourAccountClickToPay: 'Acesse sua conta Click to Pay',
  emailLabel: 'E-mail',
  disclaimerClickToPay:
    'O Click to Pay usará essas informações para verificar você e pode enviar códigos de verificação para este número.',
  otpUserPageTitle: 'Click to Pay encontrou seus cartões vinculados',
  continueLabel: 'Continuar',
  moreInformationLabel: 'Mais informações',
  missingEmailLabel: 'Você deve aceitar os Termos e Condições antes de continuar.',
};

export const screenAuthFlowClickToPay: ClickToPayTranslations['screenAuthFlowClickToPay'] = {
  cvvRequiredMessage: 'CVV/CVC não é válido.',
  labelEmailChannel: 'E-mail',
  labelSmsChannel: 'Celular',
  buttonContinueToAuthFlow: 'Continuar',
  labelCvvEmptyError: 'Insira o número de CVV de seu cartão para continuar',
};

export const screenNewUserDataSection: ClickToPayTranslations['screenNewUserDataSection'] = {
  userDataTitle: 'Dados do Titular do Cartão',
  firstNameLabel: 'Nome',
  lastNameLabel: 'Sobrenome',
};

export const screenPaymentSection: ClickToPayTranslations['screenPaymentSection'] = {
  paymentsTitle: 'Detalhes do Pagamento',
  cardNumberLabel: 'Número do cartão',
  cardHolderLabel: 'Nome como aparece no cartão',
  expirationDateLabel: 'Data de Validade',
  securityCodeLabel: 'CVV/CVC',
};

export const screenBillingSection: ClickToPayTranslations['screenBillingSection'] = {
  billingTitle: 'Dados de faturamento',
};

export const clickToPayAgreementSection: ClickToPayTranslations['clickToPayAgreementSection'] = {
  agreementDisclaimer:
    'Ao continuar, aceito compartilhar minhas informações de pagamento com a rede de pagamentos para armazená-las no Click to Pay e poder fazer pagamentos online mais rápidos.',
};

export const errorMessagesCardForm: ClickToPayTranslations['errorMessagesCardForm'] = {
  cardHolder: 'Por favor, insira nome e sobrenome.',
  cardNumber: 'Insira um número de cartão válido.',
  expirationDate: 'Formato de data MM/YY.',
  securityCode: 'Insira um código de segurança válido.',
};
