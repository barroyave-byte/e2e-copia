import { BaseProcessorPage } from '@pages/admin/connections/baseConfigConnectionPage';
import {
  MercadoPagoWalletWithExtraParamsProcessor,
  VolarisReferenceOptions,
  VolarisReferenceProcessor,
} from '@support/interfaces/payment_processors';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { expect, Locator, Page } from '@playwright/test';

export class ReferenceConnection extends BaseProcessorPage {
  readonly inputProcessorName: Locator;
  readonly selectCountriesSupported: Locator;
  readonly selectReferencesSupported: Locator;
  readonly optionAllCountriesSupported: Locator;
  readonly optionAllReferencesSupported: Locator;

  readonly inputPrivateKey: Locator;
  readonly optionBazReference: Locator;
  readonly optionOxxoReference: Locator;
  readonly optionSafetyPayExpress: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page, languageCode);
    this.inputProcessorName = page.getByTestId('connections-input-processor-name');
    this.selectCountriesSupported = page.getByTestId(
      'connections-configuration-value-select-countries_supported-combobox-container-trigger'
    );
    this.selectReferencesSupported = page.getByTestId(
      'connections-configuration-value-select-reference_payment_supported-combobox-container-trigger'
    );
    this.optionAllCountriesSupported = page.getByTestId(
      'connections-configuration-value-select-countries_supported-combobox-button-select-all'
    );
    this.optionAllReferencesSupported = page.getByTestId(
      'connections-configuration-value-select-reference_payment_supported-combobox-button-select-all'
    );
    this.optionBazReference = this.configurationOption(
      'reference_payment_supported',
      'baz_reference'
    );
    this.optionOxxoReference = this.configurationOption(
      'reference_payment_supported',
      'oxxo_reference'
    );
    this.optionSafetyPayExpress = this.configurationOption(
      'reference_payment_supported',
      'safetypay_express'
    );
    this.inputPrivateKey = page.getByTestId(
      'connections-configuration-value-input-text-safetypay_private_key'
    );
  }

  async fillInput({ locator, text }) {
    await expect(locator, `The input with locator ${text} is not visible`)
      .toBeVisible()
      .then(() => locator.fill(text));
  }

  async handleSelectCountriesSupported() {
    await expect(
      this.selectCountriesSupported,
      'The countries supported select is not visible'
    ).toBeVisible();
    await this.selectCountriesSupported.click();

    await this.optionAllCountriesSupported.click();
    await this.closeDropdown();
  }

  private async closeDropdown() {
    // Click on processor name input to close the dropdown
    await this.inputProcessorName.click();
  }

  async handleSelectReferencesSupported(generatorsSupported?: string[]) {
    await expect(
      this.selectReferencesSupported,
      'The references supported select is not visible'
    ).toBeVisible();
    await this.selectReferencesSupported.click();

    if (generatorsSupported && generatorsSupported.length > 0) {
      const options = {
        baz_reference: this.optionBazReference,
        oxxo_reference: this.optionOxxoReference,
        safetypay_express: this.optionSafetyPayExpress,
      };

      for (const generator of generatorsSupported) {
        const optionLocator = this.page.getByTestId(
          `connections-configuration-value-select-reference_payment_supported-option-${generator}`
        );
        await optionLocator.click();
      }

      await this.closeDropdown();
      return;
    }

    await this.optionAllReferencesSupported.click();
    await this.closeDropdown();
  }

  async configure(
    processorData: VolarisReferenceProcessor & VolarisReferenceOptions,
    languageCode?: LanguageCodes
  ): Promise<void> {
    await this.fillInput({
      locator: this.inputProcessorName,
      text: processorData.name,
    });
    await this.selectCurrencyByCurrency(processorData.currency_iso3);
    await this.handleSelectCountriesSupported();
    await this.handleSelectReferencesSupported(
      processorData?.extra_params?.reference_payment_supported
    );

    await this.fillInput({
      locator: this.inputPrivateKey,
      text: processorData?.extra_params?.safetypay_private_key || '',
    });

    await this.clickOnConfigureProcessor();
  }
}
