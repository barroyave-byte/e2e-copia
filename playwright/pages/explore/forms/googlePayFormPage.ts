import { expect, Locator, Page } from '@playwright/test';
import { FormHelpers } from '@pages/explore/forms/formHelpers';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@support/translations/getTranslations';
import { ExploreTranslations } from '@support/translations/selectors/explore/exploreTranslations';

export class GooglePayFormPage extends FormHelpers {
  readonly page: Page;
  readonly optionFormGooglePay: Locator;
  readonly buttonPay: Locator;
  readonly walletButtonContainer: Locator;
  readonly walletButton: Locator;
  readonly selectors: ExploreTranslations;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('explore', languageCode);
    this.optionFormGooglePay = page.locator('#payment_method_google_pay');
    this.buttonPay = page.getByRole('button', { name: this.selectors.screenExplore.payButton });
    this.walletButtonContainer = this.iframePaymentWidget.locator(
      '#deuna-wallet-btn-google_pay'
    );
    this.walletButton = this.walletButtonContainer
      .locator('button[data-testid="google-pay-button"], button')
      .first();
  }

  async selectGooglePayForm() {
    await expect(this.optionFormGooglePay).toBeVisible();
    await this.optionFormGooglePay.scrollIntoViewIfNeeded();
    await this.optionFormGooglePay.click();
  }

  async clickPay() {
    await this.ensureVisibleToClick(this.buttonPay);
  }

  async assertWalletButtonVisible() {
    await expect(this.walletButtonContainer).toBeVisible({ timeout: 30_000 });
  }

  async clickWalletButton() {
    // The click handler triggers loadPaymentData → purchase API → iframe
    // navigates to the success state, which can detach the button mid-click
    // and make Playwright's actionability checks fail. dispatchEvent fires
    // the click synthetically without that race.
    await this.walletButton.dispatchEvent('click');
  }
}
