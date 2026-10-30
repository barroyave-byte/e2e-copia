import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { BazGatewayProcessor } from '@support/interfaces/payment_processors';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { expect, Locator, Page } from '@playwright/test';

export class BazGatewayConnection extends BaseProcessorPage {
  readonly selectCommercialActivity: Locator;
  readonly selectAd: Locator;
  readonly selectCommerceState: Locator;
  readonly selectDurango: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page, languageCode);
    this.selectCommercialActivity = page.getByTestId(
      'connections-configuration-value-select-CdGiro-combobox-container-trigger'
    );
    this.selectAd = page.getByTestId('connections-configuration-value-select-CdGiro-option-ADMON');
    this.selectCommerceState = page.getByTestId(
      'connections-configuration-value-select-NbEstado-combobox-container-trigger'
    );
    this.selectDurango = page.getByTestId(
      'connections-configuration-value-select-NbEstado-option-DURANGO'
    );
  }

  async selectAdCommercialActivity(): Promise<void> {
    console.log(`Selecting Commercial Activity ...`);
    await expect(
      this.selectCommercialActivity,
      'The commercial activity select is not visible'
    ).toBeVisible();
    await this.selectCommercialActivity.click();
    await expect(this.selectAd, 'The ad option is not visible').toBeVisible();
    await this.selectAd.click();
  }
  async selectDurangoCommerceState(): Promise<void> {
    console.log(`Selecting Commerce State ...`);
    await expect(
      this.selectCommerceState,
      'The commerce state select is not visible'
    ).toBeVisible();
    await this.selectCommerceState.click();
    await expect(this.selectDurango, 'The Durango option is not visible').toBeVisible();
    await this.selectDurango.click();
  }

  async configure(processorData: BazGatewayProcessor, languageCode?: LanguageCodes): Promise<void> {
    await this.fillProcessorName(processorData.name);

    await this.selectCurrencyByCurrency(processorData.currency_iso3);

    await this.fillMerchantId(processorData.merchant_id);

    await this.configurationTextInput('IdBranch').fill(processorData.branch_id);

    await this.configurationTextInput('User').fill(processorData.user);

    await this.configurationTextInput('Pwd').fill(processorData.password);

    await this.fillExternalMerchantId(processorData.external_merchant_id);

    await this.configurationTextInput('NuCp').fill(processorData.postal_code);

    await this.configurationTextInput('CdMcc').fill(processorData.activity_id);

    await this.selectAdCommercialActivity();

    await this.configurationTextInput('CdName').fill(processorData.commerce_name);

    await this.configurationTextInput('NbCalle').fill(processorData.commerce_street);

    await this.configurationTextInput('NbCiudad').fill(processorData.commerce_city);

    await this.selectDurangoCommerceState();

    await this.configurationTextInput('NbColonia').fill(processorData.commerce_colony);

    await this.configurationTextInput('NbExterior').fill(processorData.commerce_number_ext);

    await this.configurationTextInput('NbInterior').fill(processorData.commerce_number_int);

    await this.clickOperationPaymentIfVisible(processorData);

    // Proceed to the next step regardless
    await this.clickOnConfigureProcessor();
  }
}
