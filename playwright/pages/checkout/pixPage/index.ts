import { FrameLocator, Locator, Page } from '@playwright/test';
import { CommonsActions } from '@pages/commonActions';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { getTranslations } from '@support/translations/getTranslations';

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');

export class PixPage extends CommonsActions {
  readonly page: Page;

  readonly iframeZoidVisible: FrameLocator;

  readonly labelAsaasPixDisclaimerTitle: Locator;
  readonly labelAsaasPixDisclaimerDescription: Locator;
  readonly labelAsaasPixDisclaimerBullet1: Locator;
  readonly labelAsaasPixDisclaimerBullet2: Locator;

  // Locators
  constructor(page: Page) {
    super(page);
    this.page = page;

    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');

    this.labelAsaasPixDisclaimerTitle = this.iframeZoidVisible.getByText(
      checkoutTranslations.asaasPixDisclaimer.title
    );
    this.labelAsaasPixDisclaimerDescription = this.iframeZoidVisible.getByText(
      checkoutTranslations.asaasPixDisclaimer.description
    );
    this.labelAsaasPixDisclaimerBullet1 = this.iframeZoidVisible.getByText(
      checkoutTranslations.asaasPixDisclaimer.bullet1
    );
    this.labelAsaasPixDisclaimerBullet2 = this.iframeZoidVisible.getByText(
      checkoutTranslations.asaasPixDisclaimer.bullet2
    );
  }

  // Assertions
  async assertPixDisclaimer(options?: { timeout?: number }) {
    await this.ensureVisible(this.labelAsaasPixDisclaimerTitle, { timeout: options?.timeout });
    await this.ensureVisible(this.labelAsaasPixDisclaimerDescription, {
      timeout: options?.timeout,
    });
    await this.ensureVisible(this.labelAsaasPixDisclaimerBullet1, { timeout: options?.timeout });
    await this.ensureVisible(this.labelAsaasPixDisclaimerBullet2, { timeout: options?.timeout });
  }
}
