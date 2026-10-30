import { expect, Locator, Page } from '@playwright/test';
import { FormHelpers } from '@pages/explore/forms/formHelpers';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@support/translations/getTranslations';
import { ExploreTranslations } from '@support/translations/selectors/explore/exploreTranslations';

export class AplazoFormPage extends FormHelpers {
  readonly page: Page;
  readonly optionFormAplazo: Locator;
  readonly buttonPay: Locator;
  readonly labelThankYouPageTitle: Locator;
  readonly buttonGoToSiteButton: Locator;
  readonly selectors: ExploreTranslations;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('explore', languageCode);
    this.optionFormAplazo = page.locator('#payment_method_aplazo');
    this.buttonPay = page.getByRole('button', { name: this.selectors.screenExplore.payButton });
    this.labelThankYouPageTitle = page.locator('#successful_order_text h1');
    this.buttonGoToSiteButton = page.getByTestId('go_to_site-button');
  }

  //Actions
  async selectAplazoForm() {
    await expect(this.optionFormAplazo).toBeVisible();
    await this.optionFormAplazo.scrollIntoViewIfNeeded();
    await this.optionFormAplazo.click();
  }

  async clickPay() {
    await this.ensureVisibleToClick(this.buttonPay);
  }

  async clickGoToSiteButton() {
    await this.ensureVisibleToClick(
      this.iframeLocator(this.buttonGoToSiteButton),
      undefined,
      undefined,
      { timeout: 30000 }
    );
  }

  async assertThankyouPage(text: string) {
    await expect(this.labelThankYouPageTitle).toHaveText(text, { timeout: 120000 });
  }
}
