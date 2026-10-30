import { PaymentLinkTranslations } from './paymentLinkTranslations';

export const screenBillingData: PaymentLinkTranslations['screenBillingData'] = {
  checkboxLabel: 'Faturar com os mesmos dados',
  formTitle: 'Digite suas informações de faturamento',
  formSaveButton: 'Salvar',
  addBillingData: 'Adicionar dados',
  phoneInputAriaLabel: 'Please enter a phone number',
};

export const screenMainView: PaymentLinkTranslations['screenMainView'] = {
  cardFormTitle: 'Digite os dados do seu cartão',
  billingFormTitle: 'Informações de faturamento',
  orderDetailsTitle: 'Seu pedido',
};

export const screenInstallmentsQuantityMSI: PaymentLinkTranslations['screenInstallmentsQuantityMSI'] =
  {
    labelInstallmentsMSI: 'de \\$\\d+\\.\\d{2} sem juros',
    buttonInstallmentsMSI: 'Sem parcelas Down',
  };

export const screenPaymentLinkUserInfo: PaymentLinkTranslations['screenPaymentLinkUserInfo'] = {
  subtotal: 'Subtotal',
  termsAndConditions:
    'Ao continuar você aceita as Políticas de Privacidade e os Termos e condições da DEUNA',
};

export const screenPaymentLinkPaymentForm: PaymentLinkTranslations['screenPaymentLinkPaymentForm'] =
  {
    saveCardsLabel: 'Salvar as informações do meu cartão para futuras compras.',
  };

export const screenPseFormPage: PaymentLinkTranslations['screenPseFormPage'] = {
  labelNaturalPersonOption: 'Natural',
};

export const screenPaymentLinkPaymentFormDenied: PaymentLinkTranslations['screenPaymentLinkPaymentFormDenied'] =
  {
    linkIsnotAvailable: 'link não disponível',
    pleaseCheckOrderStatus: 'por favor, verifique o status da sua ordem ou tente novamente.',
  };
