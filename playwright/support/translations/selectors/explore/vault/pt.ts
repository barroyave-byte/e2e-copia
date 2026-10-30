import { VaultTranslations } from './vaultTranslations';

export const screenVaultWidgetPage: VaultTranslations['screenVaultWidgetPage'] = {
  labelInstallmentsMSI: 'de \\$\\d+\\.\\d{2} sem juros',
  buttonInstallmentsMSI: 'Sem parcelas Down',
  titleMainView: 'Pague com cartão de crédito ou débito',
  buttonAddNewCard: 'Adicionar nova cartão',
  labelLoadingInstallments: 'Validando parcelas...',
  labelInvalidCardHolder: 'Por favor, insira nome e sobrenome.',
  labelCardIdentityDocument: 'CPF/ CNPJ',
  buttonBackToCardForm: 'Cancelar',
  buttonSaveBillingForm: 'Salvar',
};

export const screenErrorView: VaultTranslations['screenErrorView'] = {
  labelErrorViewTitle: 'Algo deu errado!',
  labelErrorViewDescription:
    'Não foi possível processar o pagamento com a cartão inserido. Por favor, tente novamente.',
};

export const screenBillingData: VaultTranslations['screenBillingData'] = {
  title: 'Dados de faturamento',
  formSaveButton: 'Salvar',
  addBillingData: 'Adicionar dados',
  phoneInputAriaLabel: 'Por favor, insira um número de telefone',
};
