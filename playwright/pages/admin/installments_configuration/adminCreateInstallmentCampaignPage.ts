import { CommonsActions } from '@pages/commonActions';
import { expect, Locator, Page, Response } from '@playwright/test';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import type { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import type {
  InstallmentsCampaign,
  ConfigInstallmentsMonths,
} from '@pages/admin/installments_configuration/installmentsCampaign';
import {
  INSTALLMENTS_CONFIG_DATA_TEST_IDS,
  installmentsCampaignTypeValueTestId,
} from './constants';

type CampaignType = InstallmentsCampaign['installments_type'];

export class AdminCreateInstallmentCampaignPage extends CommonsActions {
  protected page: Page;

  readonly labelStep2CampaignValidity: Locator;
  readonly labelStep3PaymentReceiver: Locator;
  readonly labelStep4InstallmentsConfig: Locator;

  readonly selectCampaignType: Locator;
  private readonly campaignTypeOptions: Record<CampaignType, Locator>;

  readonly inputCampaignName: Locator;
  readonly buttonStep1Continue: Locator;

  readonly checkboxCheckedNoSpecificTerm: Locator;
  readonly checkboxNoSpecificTermInput: Locator;
  readonly buttonStep2Continue: Locator;

  readonly buttonStep3Continue: Locator;

  readonly selectMonths: Locator;
  readonly getEditActionBtnByMonth: (month: number) => Locator;
  readonly buttonSaveActivateCampaign: Locator;
  readonly buttonConfigMonthSave: Locator;

  // processors
  readonly chipPspOpenPay: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;

    this.labelStep2CampaignValidity = page.getByTestId(
      INSTALLMENTS_CONFIG_DATA_TEST_IDS.labelStep2CampaignValidity
    );
    this.labelStep3PaymentReceiver = page.getByTestId(
      INSTALLMENTS_CONFIG_DATA_TEST_IDS.labelStep3PaymentReceiver
    );
    this.labelStep4InstallmentsConfig = page.getByTestId(
      INSTALLMENTS_CONFIG_DATA_TEST_IDS.labelStep4InstallmentsConfig
    );

    // step1
    this.selectCampaignType = page.getByTestId(
      'config-installments-create-campaign-form-campaign-type'
    );
    this.campaignTypeOptions = {
      MSI: page.getByTestId('config-installments-campaign-type-select-option-MSI'),
      MCI: page.getByTestId('config-installments-campaign-type-select-option-MCI'),
    };
    this.inputCampaignName = page.getByTestId(INSTALLMENTS_CONFIG_DATA_TEST_IDS.inputCampaignName);
    this.buttonStep1Continue = page.getByTestId(
      INSTALLMENTS_CONFIG_DATA_TEST_IDS.buttonStep1Continue
    );

    // step2
    this.checkboxCheckedNoSpecificTerm = page.getByTestId(
      INSTALLMENTS_CONFIG_DATA_TEST_IDS.checkboxCheckedNoSpecificTerm
    );
    this.checkboxNoSpecificTermInput = this.checkboxCheckedNoSpecificTerm.getByRole('checkbox');
    this.buttonStep2Continue = page.getByTestId(
      INSTALLMENTS_CONFIG_DATA_TEST_IDS.buttonStep2Continue
    );

    // step3
    this.buttonStep3Continue = page.getByTestId(
      INSTALLMENTS_CONFIG_DATA_TEST_IDS.buttonStep3Continue
    );
    this.chipPspOpenPay = page.getByTestId(INSTALLMENTS_CONFIG_DATA_TEST_IDS.chipPspOpenPay);

    // step4
    this.selectMonths = page.getByTestId(INSTALLMENTS_CONFIG_DATA_TEST_IDS.selectMonths);
    this.getEditActionBtnByMonth = (month: number) =>
      page.getByTestId(`config-installments-create-campaign-button-edit-month-${month}`);

    // Actions
    this.buttonSaveActivateCampaign = page.getByTestId(
      INSTALLMENTS_CONFIG_DATA_TEST_IDS.buttonSaveActivateCampaign
    );
    this.buttonConfigMonthSave = page.getByTestId(
      INSTALLMENTS_CONFIG_DATA_TEST_IDS.buttonConfigMonthSave
    );
  }

  getCheckboxOptionByMonth(month: number) {
    return this.page.getByTestId(`config-installments-create-campaign-month-option-${month}`);
  }

  getConfigMonthDrawerTitle(month: number): Locator {
    return this.page.getByTestId(`config-installments-create-campaign-drawer-msi-title-${month}`);
  }

  getCheckboxByFranchise(franchise: string) {
    return this.page.getByTestId(`config-installments-create-campaign-column-active-${franchise}`);
  }

  async campaignTypeSelectClick() {
    await this.ensureVisibleToClick(this.selectCampaignType);
    await this.page.waitForTimeout(500);
    await expect(this.campaignTypeOptions.MSI).toBeVisible();
  }

  async selectOption(option: CampaignType) {
    await this.campaignTypeOptions[option].click();
    await this.page.waitForTimeout(500);
    await this.assertCampaignTypeSelected(option);
  }

  async selectPaymentProcessor(processors: ConnectionsAvailable[] | null) {
    if (processors === null) {
      const locatorProcesorDefault = this.page.locator('[data-testid*="psp"]');
      await this.ensureVisibleToClick(
        locatorProcesorDefault.first(),
        undefined,
        'There are no processors to select',
        { timeout: 25000 }
      );
    } else {
      for (const processor of processors) {
        const psp = `psp-${processor.toUpperCase()}`;
        const locatorPaymentProcessor = this.page.locator(`[data-testid*="${psp}"]`);
        await this.ensureVisibleToClick(
          locatorPaymentProcessor,
          undefined,
          `The processor ${processor} is not available`
        );
      }
    }
  }

  async assertCampaignTypeSelected(option: CampaignType) {
    const selectedValue = this.page.getByTestId(installmentsCampaignTypeValueTestId(option));
    await expect(selectedValue).toBeVisible();
  }

  async fillCampaignDetails(option: CampaignType, campaignName: string) {
    await this.selectOption(option);
    await this.fillAndVerifyValue(this.inputCampaignName, campaignName);
  }

  async goToNextStep(currentStepBtn: Locator, nextTitleExpected: Locator) {
    await this.clickAndVerifyLabel(currentStepBtn, nextTitleExpected);
  }

  async configureCampaign(installmentsCampaign: InstallmentsCampaign) {
    await this.fillCampaignDetails(
      installmentsCampaign.installments_type,
      installmentsCampaign.name
    );
    await this.configureCampaignDate(installmentsCampaign.campaign_date);
    await this.selectPaymentProcessor(installmentsCampaign.processor);
    await this.selectMonthsToInstallment(installmentsCampaign.months, installmentsCampaign.actions);
  }

  async configureCampaignDate(dates: { start: string; end: string } | null) {
    if (dates) {
      await this.page
        .getByTestId(INSTALLMENTS_CONFIG_DATA_TEST_IDS.inputCampaignStartDate)
        .fill(dates.start);
      await this.page
        .getByTestId(INSTALLMENTS_CONFIG_DATA_TEST_IDS.inputCampaignEndDate)
        .fill(dates.end);
    } else {
      await this.isCheckedNoSpecificTerm();
    }
  }

  async clickContinueToStep2() {
    await this.goToNextStep(this.buttonStep1Continue, this.labelStep2CampaignValidity);
  }

  async clickContinueToStep3() {
    await this.goToNextStep(this.buttonStep2Continue, this.labelStep3PaymentReceiver);
  }

  async clickContinueToStep4() {
    await this.goToNextStep(this.buttonStep3Continue, this.labelStep4InstallmentsConfig);
  }

  async isCheckedNoSpecificTerm() {
    await expect(
      this.checkboxNoSpecificTermInput,
      'The no-specific-term checkbox input is not visible'
    ).toBeVisible({
      timeout: 40_000,
    });
    await this.checkboxNoSpecificTermInput.setChecked(true, { timeout: 40000 });
    await expect(this.checkboxNoSpecificTermInput).toBeChecked();
  }

  async verifyPSPVisibleToSelect(processor: Locator) {
    await expect(processor, 'The PSP option is not visible').toBeVisible({ timeout: 40_000 });
    await processor.setChecked(true, { timeout: 40000 });
    await expect(processor).toBeChecked();
  }

  async selectMonthsToInstallment(
    months: number[],
    actions?: (checkbox: Locator) => { [key: number]: () => Promise<void> }
  ) {
    await this.ensureVisibleToClick(this.selectMonths);

    for (const month of months) {
      const checkbox = await this.getCheckboxOptionByMonth(month);
      await expect(checkbox).toBeVisible();

      if (actions) {
        await actions(checkbox)[month]();
      } else {
        await checkbox.click(); // checked
      }
      await this.page.waitForTimeout(500);
    }

    // MultiSelect trigger is a chip combobox (no inner input). Close the
    // dropdown and assert each month landed in the campaign table.
    await this.page.keyboard.press('Escape');
    for (const month of months) {
      await expect(
        this.getEditActionBtnByMonth(month),
        `Month ${month} was not added to the campaign table`
      ).toBeVisible({ timeout: 15000 });
    }
  }

  async configMonthsByFranchise(months: number[], franchise: string) {
    for (const month of months) {
      await this.clickOnEditMonth(month);
      await this.assertScreenConfigMonthIsVisible(month);

      const checkboxByFranchise = this.getCheckboxByFranchise(franchise);
      await this.ensureVisibleToClick(checkboxByFranchise);
      await this.page.waitForTimeout(500);
      await this.ensureVisibleToClick(this.buttonConfigMonthSave);
    }
  }

  async clickOnEditMonth(month: number) {
    const editBtn = this.getEditActionBtnByMonth(month);
    await editBtn.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    await this.ensureVisibleToClick(editBtn);
  }

  async assertScreenConfigMonthIsVisible(month: number) {
    await expect(this.getConfigMonthDrawerTitle(month)).toBeVisible();
  }

  async configureInstallmentMonths(config: ConfigInstallmentsMonths) {
    for (const monthConfig of config.config_months) {
      await this.clickOnEditMonth(monthConfig.months);
      await this.assertScreenConfigMonthIsVisible(monthConfig.months);

      for (const franchise of monthConfig.config_franchise) {
        await this.clickOnSwitchFranchise(franchise.franchise);
        await this.fillComissionRate(franchise.franchise, franchise.installment_rate);
        await this.fillMinAmount(franchise.franchise, franchise.min_amount);
        await this.fillMaxAmount(franchise.franchise, franchise.max_amount);
      }
      await this.ensureVisibleToClick(this.buttonConfigMonthSave);
    }
  }

  async clickOnSwitchFranchise(franchise: string) {
    const checkboxByFranchise = this.getCheckboxByFranchise(franchise);
    await this.ensureVisibleToClick(checkboxByFranchise);
    await this.page.waitForTimeout(500);
  }

  async fillComissionRate(franchise: string, comissionRate: string) {
    const locatorCommissionInput = this.page.getByTestId(
      `config-installments-create-campaign-input-commission-${franchise}`
    );
    await locatorCommissionInput.fill(comissionRate.replace('.', ',') || '0');
  }

  async fillMaxAmount(franchise: string, maxAmount: string) {
    const locatorMaxAmountInput = this.page.getByTestId(
      `config-installments-create-campaign-input-max-amount-${franchise}`
    );
    await locatorMaxAmountInput.fill(maxAmount.replace('.', ','));
  }

  async fillMinAmount(franchise: string, minAmount: string) {
    const locatorMinAmountInput = this.page.getByTestId(
      `config-installments-create-campaign-input-min-amount-${franchise}`
    );
    await locatorMinAmountInput.fill(minAmount.replace('.', ','));
  }

  async saveActiveCampaignClick(): Promise<Response> {
    const responsePromise = this.waitForPostResponse('/merchants/.*/installments/campaigns', 201);
    await this.ensureVisibleToClick(this.buttonSaveActivateCampaign);
    return responsePromise;
  }

  async validateProcessorName(response: Response, expectedName: string): Promise<void> {
    const responseBody = await response.json();
    const processors = responseBody.data.processors;

    expect(Array.isArray(processors)).toBe(true);
    expect(processors[0].name).toBe(expectedName);
  }
}
