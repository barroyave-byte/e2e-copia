import { expect, Locator, Page } from '@playwright/test';
import { FormHelpers } from './formHelpers';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { KlapTranslations } from '@support/translations/selectors/explore/klap/klapTranslations';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';

export class KlapFormPage extends FormHelpers {
  readonly page: Page;
  readonly checkoutSelectors: CheckoutTranslations;
  readonly selectors: KlapTranslations;

  readonly labelProcessingOrder: Locator;
  readonly labelRedirectingToSite: Locator;
  readonly labelProcessingPayment: Locator;
  readonly labelErrorMessage: Locator;
  readonly buttonBack: Locator;
  readonly alertNotification: Locator;
  readonly buttonCancel: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);

    this.page = page;
    this.checkoutSelectors = getTranslations('checkout', languageCode);
    this.selectors = getTranslations('explore/klap', languageCode);
    this.buttonBack = page.locator('button:has-text("Volver")');
    this.labelProcessingOrder = page.getByText(
      this.selectors.screenKlapProcessor.labelProcessingOrder
    );
    this.labelRedirectingToSite = page.getByText(
      this.selectors.screenKlapProcessor.labelRedirectingToSite
    );
    this.labelProcessingPayment = page.getByText(
      this.checkoutSelectors.apmRedirectView.labelProcessingPayment
    );
    this.labelErrorMessage = page.getByText(this.selectors.screenKlapProcessor.labelErrorMessage);
    this.alertNotification = this.iframeLocator(
      page.locator('#alert-container, #alert-container-notification-warning')
    );
    this.buttonCancel = this.iframeLocator(page.getByTestId('changeMethod-button'));
  }

  async clickOnBack() {
    await this.ensureVisibleToClick(this.iframeLocator(this.buttonBack));
  }

  async assertLabelErrorMessageVisible() {
    await this.ensureVisible(this.iframeLocator(this.labelErrorMessage), { timeout: 4000 });
  }

  async assertLabelProcessingOrderVisible() {
    await this.ensureVisible(this.iframeLocator(this.labelProcessingOrder), { timeout: 4000 });
  }

  async assertLabelRedirectingToSiteVisible() {
    await this.ensureVisible(this.iframeLocator(this.labelRedirectingToSite), { timeout: 4000 });
  }

  async assertLabelProcessingPaymentVisible() {
    await this.ensureVisible(this.iframeLocator(this.labelProcessingPayment), { timeout: 4000 });
  }

  async assertAlertNotification(text: string) {
    await expect(this.alertNotification).toContainText(text);
  }

  async cancelPurchase() {
    await this.buttonCancel.click();
    await this.assertIframeClosed();
  }
}
