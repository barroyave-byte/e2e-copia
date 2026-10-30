import { DeunanowTranslations } from './deunanowTranslations';

export const screenInstallmentsQuantityMSI: DeunanowTranslations['screenInstallmentsQuantityMSI'] =
{
  labelInstallmentsMSI: 'de \\$\\d+\\.\\d{2} sem juros',
  buttonInstallmentsMSI: 'Sem parcelas Down',
};

export const screenInstallmentsQuantityMCI: DeunanowTranslations['screenInstallmentsQuantityMCI'] =
{
  labelInstallmentsMCI: 'de \\$\\d+\\.\\d{2} com juros de \\d+\\.\\d{2}%',
  buttonInstallmentsMCI: 'Sem parcelas Down',
};

export const screenPaymentLinkUserInfo: DeunanowTranslations['screenPaymentLinkUserInfo'] = {
  cardErrorMessage: 'Por favor, insira todos os dados do seu cartão.',
  expDateErrorMessage: 'O cartão expirou.',
  cvvErrorMessage: 'Insira um CVV/CVC válido.',
  cardHolderErrorMessage: 'Evite acentos ou caracteres especiais (á,@,#, ñ).',
  cardHolderMissingLastNameErrorMessage: 'Por favor, insira seu nome e sobrenome.',
  idDocumentErrorMessage: 'Insira um documento de identidade válido.',
  subtotal: 'Subtotal',
  termsAndConditions: 'Termos e condições',
  cardFieldsErrorMessage: 'Por favor, insira todos os dados do seu cartão.',
};

export const screenRedirectToCommerceView: DeunanowTranslations['screenRedirectToCommerceView'] = {
  labelOrderCancelled: 'Seu pedido já foi cancelado',
  labelPaymentCancelled: 'Seu pagamento já foi cancelado',
  labelProcessingPayment: 'Seu pagamento já está sendo processado',
  labelProcessingOrder: 'Estamos processando seu pedido',
};

export const screenThankYouPage: DeunanowTranslations['screenThankYouPage'] = {
  labelSuccessfulTitle: 'Pagamento concluído',
  labelPaymentNumber: 'Número de pagamento',
  labelTransactionNumber: 'Número de transação DEUNA',
};

export const screenBillingData: DeunanowTranslations['screenBillingData'] = {
  checkboxLabel: 'Faturar com os mesmos dados',
  titleBillingView: 'Insira seus dados de faturamento',
  buttonFormSave: 'Manter',
  addBillingData: 'Adicionar dados',
  changeBillingData: 'Alterar',
  buttonFormCancel: 'Cancelar',
  descriptionInputRequired: 'Este campo é obrigatório.',
};

export const screenPaymentLinkPaymentForm: DeunanowTranslations['screenPaymentLinkPaymentForm'] = {
  saveCardsLabel: 'Salvar as informações do meu cartão para futuras compras.',
  title: 'Paga com Pagamento com cartão de crédito ou débito',
  description: 'Por favor, insira os dados do seu cartão',
  payWith: 'Pagar com',
  privacyPolicy: 'Políticas de privacidade',
  termsAndConditions: 'Términos e condições de DEUNA',
};

export const screenAlertNotifications: DeunanowTranslations['screenAlertNotifications'] = {
  missingBillingData: 'Insira dados de faturamento para continuar.',
  selectInstallments: 'Selecione as parcelas que se aplicam à sua transação.',
  purchaseError: 'Lamentamos, tivemos um problema ao processar seu pagamento. Tente novamente.',
  widgetPurchaseError: 'Tivemos um problema ao processar seu pagamento. Tente novamente.',
  somethingWentWrong: "Algo deu errado. Por favor, tente novamente.",
  accountConfigurationError: "Não podemos configurar sua conta. Tente novamente."
};

export const screenMainPage: DeunanowTranslations['screenMainPage'] = {
  buttonPay: 'Pagar',
};

export const screenExpiryDateField: DeunanowTranslations['screenExpiryDateField'] = {
  invalidFormat: 'Formato de data MM/YY.',
  invalidMonth: 'O mês deve estar entre 01 e 12.',
  cardExpired: 'O cartão expirou.',
};

export const screenOrderSummaryDeunaNow: DeunanowTranslations['screenOrderSummaryDeunaNow'] = {
  labelPendingPayment: '',
  buttonBackToHome: '',
};

export const screenTransactionViewResult: DeunanowTranslations['screenTransactionViewResult'] = {
  labelDeniedTitle: 'Pagamento recusado',
  labelDeniedMainMessage: 'Não foi possível processar sua transação. Verifique os dados inseridos e tente novamente.',
};

export const screenDeleteCard: DeunanowTranslations['screenDeleteCard'] = {
  deleteOption: 'Eliminar',
  confirmButton: 'Confirmar',
};
