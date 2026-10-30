import { FrameLocator, Locator, Page } from '@playwright/test';
import { CommonsActions } from '@pages/commonActions';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { getTranslations } from '@support/translations/getTranslations';

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');

export class FemsaOxxoCashPage extends CommonsActions {
  readonly page: Page;

  readonly iframeZoidVisible: FrameLocator;

  readonly labelFemsaOxxoDisclaimerTitle: Locator;
  readonly labelFemsaOxxoDisclaimerDescription: Locator;

  // Locators
  constructor(page: Page) {
    super(page);
    this.page = page;

    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');

    this.labelFemsaOxxoDisclaimerTitle =
      this.iframeZoidVisible.getByText(checkoutTranslations.femsaOxxoCashDisclaimer.title);
    this.labelFemsaOxxoDisclaimerDescription =
      this.iframeZoidVisible.getByText(checkoutTranslations.femsaOxxoCashDisclaimer.description);
  }

  // Assertions
  async assertFemsaOxxoDisclaimer() {
    await this.ensureVisible(this.labelFemsaOxxoDisclaimerTitle, {});
    await this.ensureVisible(this.labelFemsaOxxoDisclaimerDescription, {});
  }
}
