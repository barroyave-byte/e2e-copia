import { expect, FrameLocator, Locator, Page } from '@playwright/test';
import { FormHelpers } from '@pages/explore/forms/formHelpers';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { VaultTranslations } from '@support/translations/selectors/explore/vault/vaultTranslations';

export class VaultWidgetModalPage extends FormHelpers {
  readonly page: Page;

  readonly iframeZoidVisible: FrameLocator;
  readonly buttonSave: Locator;

  readonly buttonUpdateBillingData: Locator;
  readonly buttonAddBillingData: Locator;

  readonly selectors: VaultTranslations;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;

    this.selectors = getTranslations('explore/vault', languageCode);
    this.iframeZoidVisible = page.frameLocator('#vault_modal_container iframe');
    this.buttonSave = page.locator('#vault_payment_button');
    this.buttonUpdateBillingData = page.locator('[data-testid="btn-update-billing-data"]');
    this.buttonAddBillingData = page.locator('#btn-add-billing-data');
  }

  private getZoidLocator(locator: Locator): Locator {
    return this.iframeZoidVisible.locator(locator);
  }

  /**
   * Asserts that the vault widget was loaded.
   */
  async assertVaultWidgetWasLoaded() {
    await expect(this.getZoidLocator(this.buttonSave)).toBeVisible();
  }

  /**
   * Asserts that the billing summary is not visible.
   */
  async assertBillingSummaryIsNotVisible() {
    await expect(this.getZoidLocator(this.buttonUpdateBillingData)).toBeHidden();
    await expect(this.getZoidLocator(this.buttonAddBillingData)).toBeHidden();
  }

  /**
   * Asserts that the billing summary is visible.
   */
  async assertBillingSummaryIsVisible() {
    await expect(this.getZoidLocator(this.buttonAddBillingData)).toBeVisible();
  }
}
