import { VaultTranslations } from './vaultTranslations';

export const screenVaultWidgetPage: VaultTranslations['screenVaultWidgetPage'] = {
  labelInstallmentsMSI: 'de \\$\\d+\\.\\d{2} sin interés',
  buttonInstallmentsMSI: 'Sin cuotas Down',
  titleMainView: 'Paga con tarjeta crédito o débito',
  buttonAddNewCard: 'Agregar nueva tarjeta',
  labelLoadingInstallments: 'Validando cuotas...',
  labelInvalidCardHolder: 'Por favor, ingresa nombre y apellido.',
  labelCardIdentityDocument: 'Número de RFC',
  buttonBackToCardForm: 'Cancelar',
  buttonSaveBillingForm: 'Guardar',
};

export const screenErrorView: VaultTranslations['screenErrorView'] = {
  labelErrorViewTitle: '¡Algo salió mal!',
  labelErrorViewDescription:
    'Se produjo un inconveniente al cargar esta página. Por favor, recargue la página para continuar.',
};

export const screenBillingData: VaultTranslations['screenBillingData'] = {
  title: 'Datos de facturación',
  formSaveButton: 'Guardar',
  addBillingData: 'Agregar datos',
  phoneInputAriaLabel: 'Por favor, ingresa un número de teléfono',
};
