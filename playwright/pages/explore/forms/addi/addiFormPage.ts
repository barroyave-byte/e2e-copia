import { expect, Locator, Page } from '@playwright/test';
import { FormHelpers } from '@pages/explore/forms/formHelpers';
import { ExploreTranslations } from '@support/translations/selectors/explore/exploreTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { RemoteTranslations } from '@support/remote_translations/RemoteTranslations';

export class AddiFormPage extends FormHelpers {
  readonly page: Page;
  readonly optionFormAddi: Locator;
  readonly buttonPay: Locator;
  readonly buttonEmbedPay: Locator;
  readonly paymentEmbedContainer: Locator;
  readonly labelThankYouPageTitle: Locator;
  readonly selectors: ExploreTranslations;

  remoteTranslations: RemoteTranslations;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.remoteTranslations = new RemoteTranslations(page);
    this.page = page;
    this.selectors = getTranslations('explore', languageCode);
    this.optionFormAddi = page.locator('#payment_method_addi');
    this.buttonPay = page.getByRole('button', { name: this.selectors.screenExplore.payButton });
    this.buttonEmbedPay = page
      .getByTestId('embed-button-desktop')
      .or(page.getByRole('button', { name: 'Embedir Pago' }));
    this.labelThankYouPageTitle = page.locator('#successful_order_text h1');
    this.paymentEmbedContainer = page.locator('#payment-embed');
  }

  //Actions
  async selectAddiForm() {
    await expect(this.optionFormAddi, 'EXPLORE: Option Form Addi is not visible').toBeVisible();
    await this.optionFormAddi.scrollIntoViewIfNeeded();
    await this.optionFormAddi.click();
  }

  async clickPay() {
    await this.ensureVisibleToClick(
      this.buttonPay,
      undefined,
      'EXPLORE: Button Pay is not visible'
    );
  }

  async clickEmbedPay() {
    await this.ensureVisibleToClick(
      this.buttonEmbedPay,
      undefined,
      'EXPLORE: Button Embedir Pago is not visible'
    );
  }

  async scrollToEmbedContainer() {
    await this.paymentEmbedContainer.scrollIntoViewIfNeeded();
  }

  async assertThankyouPage(text: string) {
    await expect(
      this.labelThankYouPageTitle,
      'EXPLORE: Label Thank You Page is not visible'
    ).toHaveText(text, { timeout: 180000 });
  }
}
