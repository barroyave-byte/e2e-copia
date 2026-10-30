import { Locator, Page } from '@playwright/test';
import { FormHelpers } from '@pages/explore/forms/formHelpers';

export class StpCodiFormPage extends FormHelpers {
  readonly page: Page;
  readonly optionStpCodiForm: Locator;
  readonly buttonPay: Locator;

  // Locators
  constructor(page: Page) {
    super(page);
    this.page = page;

    this.optionStpCodiForm = this.page.locator('#payment_method_stp_codi');
    this.buttonPay = this.page.getByTestId('pay-button-desktop');
  }

  // Actions
  async selectStpCodiForm() {
    await this.ensureVisibleToClick(this.optionStpCodiForm);
  }

  async clickOnPayButton() {
    await this.ensureVisibleToClick(this.buttonPay);
  }
}
