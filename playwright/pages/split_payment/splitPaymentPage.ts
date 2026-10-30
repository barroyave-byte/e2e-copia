import { CommonsActions } from '@pages/commonActions';
import { Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@support/translations/getTranslations';
import { SplitPaymentTranslations } from '@support/translations/selectors/split_payments/translations';
import { FrameLocator, Locator } from '@playwright/test';

//Plan Option ID
export const defaultPlanOptionId = '00000000-0000-0000-0000-000000000000';

export class SplitPaymentPage extends CommonsActions {
  readonly page: Page;
  readonly selectors: SplitPaymentTranslations;
  readonly iframeVault: FrameLocator;
  readonly inputAdjustAmountStep: Locator; // For step view (card 1/2 editing)
  readonly inputAdjustAmountSummary: Locator; // For summary view

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('split_payments', languageCode);
    this.iframeVault = page.frameLocator(
      "xpath=//iframe[contains(@src, 'vault')] | //iframe[@data-testid='d_una_checkout'] | //iframe[contains(@class, 'zoid-visible')]"
    );
    this.inputAdjustAmountStep = this.iframeVault.locator('input[id^="card-currency-input-"]');
    this.inputAdjustAmountSummary = this.iframeVault
      .locator('[data-testid^="card-amount-row-"]')
      .locator('input');
  }

  async backToCard(ordinal: number) {
    const buttonBackToCard = this.iframeVault.locator(
      `[data-testid="edit-card-button-${ordinal}"]`
    );
    await buttonBackToCard.click();
  }

  /**
   * Adjusts the amount for a specific card in split payment flow
   * @param ordinal - Card number (1 or 2)
   * @param value - Amount value to set
   * @param options - Optional configuration
   * @param options.isSummary - If true, uses summary view locator; if false, uses step view locator (default: false)
   */
  async adjustAmountForCard(ordinal: number, value: string, options: { isSummary?: boolean } = {}) {
    const { isSummary = false } = options;
    let adjustedInput: Locator;

    // Use different locator based on view (step vs summary)
    const locator = isSummary ? this.inputAdjustAmountSummary : this.inputAdjustAmountStep;

    if (ordinal === 1) {
      adjustedInput = locator.first();
    } else {
      adjustedInput = locator.nth(ordinal - 1);
    }

    await adjustedInput.click();
    await adjustedInput.clear();
    await adjustedInput.fill(value);
    await adjustedInput.blur();
  }
}
