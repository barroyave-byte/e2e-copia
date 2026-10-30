export const INSTALLMENTS_CONFIG_DATA_TEST_IDS = {
  screenInstallments: 'screen-installments',
  buttonCreateCampaign: 'button-create-campaign',
  inputCampaignName: 'config-installments-create-campaign-form-name',
  inputCampaignStartDate: 'config-installments-create-campaign-form-start-date',
  inputCampaignEndDate: 'config-installments-create-campaign-form-end-date',
  buttonStep1Continue: 'config-installments-create-campaign-button-continue-1',
  checkboxCheckedNoSpecificTerm: 'config-installments-create-campaign-checkbox-no-specific-term',
  buttonStep2Continue: 'config-installments-create-campaign-button-continue-2',
  buttonStep3Continue: 'config-installments-create-campaign-button-continue-3',
  chipPspOpenPay: 'config-installments-create-campaign-psp-OPENPAY',
  selectMonths: 'config-installments-create-campaign-month-combobox-container-trigger',
  buttonAddMonthsConfig: 'addMonthsConfig',
  buttonSaveActivateCampaign: 'config-installments-create-campaign-button-save-activate',
  buttonConfigMonthSave: 'config-installments-create-campaign-dialog-button-save',
  labelStep2CampaignValidity: 'config-installments-create-campaign-step-2-title',
  labelStep3PaymentReceiver: 'config-installments-create-campaign-step-3-title',
  labelStep4InstallmentsConfig: 'config-installments-create-campaign-step-4-title',
} as const;

export function installmentsCampaignTypeValueTestId(option: string): string {
  return `config-installments-campaign-type-select-value-${option}`;
}
