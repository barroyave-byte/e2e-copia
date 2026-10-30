import { expect, Locator, Page } from '@playwright/test';
import { FormHelpers } from './formHelpers';

export class FintocFormPage extends FormHelpers {
  readonly page: Page;
  readonly optionFormFintoc: Locator;
  readonly buttonEmbedDesktop: Locator;
  readonly infoTitle: Locator;
  readonly infoSubtitle: Locator;
  readonly buttonPay: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;

    this.optionFormFintoc = page
      .locator('#payment_method_fintoc')
      .or(page.locator('[data-testid="payment-method-fintoc"]'));
    this.buttonEmbedDesktop = page.getByTestId('pay-button-desktop');
    this.infoTitle = page.getByText('Paga con tu banco');
    this.infoSubtitle = page.getByText('Al hacer clic en “Pagar”, serás redireccionado a fintoc.');
    this.buttonPay = page.locator('#payment-button').or(page.getByTestId('pay-button'));
  }

  async selectFintocForm() {
    await this.ensureVisibleToClick(this.optionFormFintoc);
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.ensureVisibleToClick(this.buttonEmbedDesktop);
  }

  async assertFintocInfoVisible() {
    await expect(this.iframeLocator(this.infoTitle)).toBeVisible({ timeout: 40000 });
    await expect(this.iframeLocator(this.infoSubtitle)).toBeVisible({ timeout: 40000 });
  }

  async clickPay() {
    await this.ensureVisibleToClick(this.iframeLocator(this.buttonPay));
  }
}
