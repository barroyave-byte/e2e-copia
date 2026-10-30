import { Locator, Page } from '@playwright/test';
import { FormHelpers } from '@pages/explore/forms/formHelpers';

export class VenmoFormPage extends FormHelpers {
  readonly page: Page;
  readonly optionVenmoForm: Locator;
  readonly buttonPay: Locator;

  // Locators
  constructor(page: Page) {
    super(page);
    this.page = page;

    this.optionVenmoForm = this.page.locator('#payment_method_venmo');
    this.buttonPay = this.page.getByTestId('pay-button-desktop');
  }

  // Actions
  async selectVenmoForm() {
    await this.ensureVisibleToClick(this.optionVenmoForm);
  }

  async clickOnPayButton() {
    await this.ensureVisibleToClick(this.buttonPay);
  }
}
