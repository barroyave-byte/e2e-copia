import { expect, Locator, Page } from '@playwright/test';
import { FormHelpers } from '@pages/explore/forms/formHelpers';

export class PaypalPayLaterFormPage extends FormHelpers {
  readonly page: Page;
  readonly optionPaypalPayLaterForm: Locator;
  readonly buttonPay: Locator;
  readonly labelThankYouPageTitle: Locator;

  // Locators
  constructor(page: Page) {
    super(page);
    this.page = page;

    this.optionPaypalPayLaterForm = this.page.locator('#payment_method_paypal_pay_later');
    this.buttonPay = this.page.getByTestId('pay-button-desktop');
    this.labelThankYouPageTitle = page.locator('#successful_order_text h1');
  }

  // Actions
  async selectPaypalPayLaterForm() {
    await this.ensureVisibleToClick(this.optionPaypalPayLaterForm);
  }

  async clickOnPayButton() {
    await this.ensureVisibleToClick(this.buttonPay);
  }

  async assertThankyouPage(text: string) {
    await expect(
      this.labelThankYouPageTitle,
      'EXL:ThankYouPage:Thank you page title not visible'
    ).toHaveText(text, { timeout: 120000 });
  }
}
