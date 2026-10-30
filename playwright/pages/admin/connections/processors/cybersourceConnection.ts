import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import { CybersourceProcessor } from '@support/interfaces/payment_processors';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { expect, Locator, Page } from '@playwright/test';

export class CybersourceConnection extends BaseProcessorPage {
  readonly selectAcquirer: Locator;
  readonly acquirerOption: (acquirer: string) => Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page, languageCode);
    this.selectAcquirer = page.getByTestId(
      'connections-configuration-value-select-acquirer_configuration-combobox-container-trigger'
    );
    this.acquirerOption = (acquirer: string) =>
      page.getByTestId(
        `connections-configuration-value-select-acquirer_configuration-option-${acquirer.toLowerCase()}`
      );
  }

  private async selectAcquirerConfiguration(acquirer: string): Promise<void> {
    await expect(
      this.selectAcquirer,
      'The acquirer configuration select is not visible'
    ).toBeVisible({ timeout: 40_000 });
    await this.selectAcquirer.click();

    const option = this.acquirerOption(acquirer);
    await expect(option, `The ${acquirer} acquirer option is not visible`).toBeVisible({
      timeout: 40_000,
    });
    await option.click();
  }

  async configure(
    processorData: CybersourceProcessor,
    languageCode?: LanguageCodes
  ): Promise<void> {
    await this.fillProcessorName(processorData.name);

    await this.selectCurrencyByCurrency(processorData.currency_iso3);

    await this.fillPrivateKey(processorData.private_api_key);

    await this.fillPublicKey(processorData.public_api_key);

    await this.fillExternalMerchantId(processorData.external_merchant_id);

    await this.selectAcquirerConfiguration(processorData.acquirer_configuration);

    await this.clickOperationPayment(processorData);

    if (
      processorData.enable_3ds_authentication &&
      processorData.three_ds_processing_provider === 'deuna'
    ) {
      await this.toggleSecurityMethods();

      await expect(this.checkboxAllowDeuna3DS).toBeVisible();
      await this.checkboxAllowDeuna3DS.click();
      await this.configureDeunaThreeDS(processorData);
    }

    await this.clickOnConfigureProcessor();
  }
}
