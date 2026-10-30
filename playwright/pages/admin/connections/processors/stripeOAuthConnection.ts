import { BaseProcessor } from '@support/interfaces/payment_processors';
import { BaseProcessorPage } from '../baseConfigConnectionPage';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { expect, Locator, Page } from '@playwright/test';

export class StripeOAuthConnection extends BaseProcessorPage {
  readonly radioStripeAccountYes: Locator;
  readonly buttonStripeNext: Locator;
  readonly radioStripeLinkedNo: Locator;
  readonly buttonSkipAccount: Locator;

  constructor(page: Page, languageCode?: LanguageCodes) {
    super(page, languageCode);
    this.radioStripeAccountYes = page.getByTestId('connections-stripe-radio-account-yes');
    this.buttonStripeNext = page.getByTestId('connections-stripe-button-next');
    this.radioStripeLinkedNo = page.getByTestId('connections-stripe-radio-linked-no');
    this.buttonSkipAccount = page.locator('#skip-account-app');
  }

  async configure(processorData: BaseProcessor, languageCode?: LanguageCodes): Promise<void> {
    // Merchant has a Stripe account
    await expect(
      this.radioStripeAccountYes,
      'The "has a Stripe account" radio is not visible'
    ).toBeVisible({
      timeout: 30_000,
    });
    await this.radioStripeAccountYes.click();
    await expect(
      this.buttonStripeNext,
      'The Stripe wizard "Next" button is not visible'
    ).toBeVisible({
      timeout: 30_000,
    });
    await this.buttonStripeNext.click();

    // Merchant has Stripe account linked to another platform
    await expect(
      this.radioStripeLinkedNo,
      'The "account not linked to another platform" radio is not visible'
    ).toBeVisible({ timeout: 30_000 });
    await this.radioStripeLinkedNo.click();
    await expect(
      this.buttonStripeNext,
      'The Stripe wizard "Next" button is not visible'
    ).toBeVisible({
      timeout: 30_000,
    });
    await this.buttonStripeNext.click();

    // Insert credentials
    await this.fillProcessorName(processorData.name);

    await this.selectCurrencyByCurrency(processorData.currency_iso3);

    await this.clickOperationPayment(processorData);

    // Redirects merchant to Stripe Authorization page (confirms the create-connection dialog internally)
    await this.clickOnConfigureProcessor();

    // Stripe OAuth page - "Use blank account" connects a test Stripe account without full onboarding
    await expect(this.buttonSkipAccount, 'The skip account button is not visible').toBeVisible({
      timeout: 30_000,
    });
    await this.buttonSkipAccount.click();
  }
}
