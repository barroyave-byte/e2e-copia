import { expect, FrameLocator, Locator, Page } from '@playwright/test';
import { FormHelpers } from '@pages/explore/forms/formHelpers';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { BaseCreditCard } from '@support/interfaces/credit_cards';

export class VaultWidgetFormPage extends FormHelpers {
  readonly page: Page;
  readonly selectVaultWidgetMethod: Locator;
  readonly sectionVaultWidgetContainer: Locator;
  readonly buttonEmbedPay: Locator;

  readonly iframeZoidVisible: FrameLocator;
  readonly buttonPay: Locator;

  readonly buttonUpdateBillingData: Locator;

  readonly selectors: DeunanowTranslations;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;

    this.selectors = getTranslations('deunanow', languageCode);
    this.selectVaultWidgetMethod = page.locator('#payment_method_vault_web_sdk');
    this.sectionVaultWidgetContainer = page.locator('#vault_embed_container');
    this.buttonEmbedPay = page.getByText('Embedir Pago');
    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');
    this.buttonPay = page.locator('#vault_payment_button');
    this.buttonUpdateBillingData = page.locator('[data-testid="btn-update-billing-data"]');
  }

  private getZoidLocator(locator: Locator): Locator {
    return this.iframeZoidVisible.locator(locator);
  }

  //Actions
  async selectVaultWidgetFormAndClickOnEmbedPayButton() {
    await expect(this.selectVaultWidgetMethod).toBeVisible();
    await this.selectVaultWidgetMethod.scrollIntoViewIfNeeded();
    await this.selectVaultWidgetMethod.click();

    await expect(this.buttonEmbedPay).toBeVisible();
    await this.buttonEmbedPay.scrollIntoViewIfNeeded();
    await this.buttonEmbedPay.click();
    await this.selectVaultWidgetMethod.scrollIntoViewIfNeeded();
  }

  /**
   * @returns The height of the vault widget container.
   */
  async getVaultWidgetContainerHeight(): Promise<number> {
    return this.getElementHeight(this.sectionVaultWidgetContainer);
  }

  /**
   * Asserts that the vault widget container is visible and has a height greater than 400px.
   */
  async assertVaultWidgetContainerIsVisible() {
    await expect(this.sectionVaultWidgetContainer).toBeVisible();
    const containerHeight = await this.getVaultWidgetContainerHeight();
    await expect(containerHeight).toBeGreaterThan(400);
    this.containerHeight = containerHeight;
  }

  /**
   * Asserts that the vault widget container is resized after the payment form is loaded.
   */
  async assertVaultWidgetContainerIsResizedAfterPaymentFormIsLoaded() {
    await expect(this.getZoidLocator(this.buttonPay)).toBeVisible();
    await this.assertContainerResized(this.sectionVaultWidgetContainer, 'vault widget container');
  }

  /**
   * Asserts that the vault widget container is resized when the billing form is shown.
   */
  async assertVaultWidgetContainerIsResizedWhenBillingFormIsShown() {
    await this.ensureVisibleToClick(this.buttonUpdateBillingData, this.iframeZoidVisible);
    await expect(this.getZoidLocator(this.buttonPay)).toBeHidden();
    await this.assertContainerResized(this.sectionVaultWidgetContainer, 'vault widget container');
  }
}
