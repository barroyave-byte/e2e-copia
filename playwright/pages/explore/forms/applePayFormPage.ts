import { expect, Locator, Page } from '@playwright/test';
import { FormHelpers } from '@pages/explore/forms/formHelpers';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@support/translations/getTranslations';
import { ExploreTranslations } from '@support/translations/selectors/explore/exploreTranslations';

export class ApplePayFormPage extends FormHelpers {
  readonly page: Page;
  readonly optionFormApplePay: Locator;
  readonly buttonPay: Locator;
  readonly walletButtonContainer: Locator;
  readonly walletButton: Locator;
  readonly selectors: ExploreTranslations;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('explore', languageCode);
    this.optionFormApplePay = page.locator('#payment_method_apple_pay');
    this.buttonPay = page.getByRole('button', { name: this.selectors.screenExplore.payButton });
    this.walletButtonContainer = this.iframePaymentWidget.locator(
      '#deuna-wallet-btn-apple_pay'
    );
    this.walletButton = this.walletButtonContainer.locator('apple-pay-button, button').first();
  }

  async selectApplePayForm() {
    await expect(this.optionFormApplePay).toBeVisible();
    await this.optionFormApplePay.scrollIntoViewIfNeeded();
    await this.optionFormApplePay.click();
  }

  async clickPay() {
    await this.ensureVisibleToClick(this.buttonPay);
  }

  async assertWalletButtonVisible() {
    await expect(this.walletButtonContainer).toBeVisible({ timeout: 30_000 });
  }

  async clickWalletButton() {
    // Same reasoning as Google Pay: the click triggers begin() →
    // onpaymentauthorized → purchase API → iframe success transition,
    // which can detach the button before Playwright finishes its
    // actionability dance. dispatchEvent fires the click synchronously.
    await this.walletButton.dispatchEvent('click');
  }

  async triggerSuccessAuthorization() {
    // The mock's `__deunaApplePayTrigger` lives on the modular-checkout
    // iframe's window (where the SDK runs), not the parent's. Evaluating
    // through a locator inside the iframe scopes `window` to that frame.
    // No-op when the auto-trigger inside ApplePaySessionMock.begin() has
    // already authorized — guarded by `__authorized`.
    await this.iframePaymentWidget.locator('body').evaluate(() => {
      const trigger = (window as { __deunaApplePayTrigger?: { authorize?: () => void } })
        .__deunaApplePayTrigger;
      if (!trigger || typeof trigger.authorize !== 'function') {
        throw new Error(
          'Apple Pay mock trigger is not available — was installWalletMocks() called before navigation?'
        );
      }
      trigger.authorize();
    });
  }
}
