import { FrameLocator, Locator, Page } from '@deuna/test';
import { CommonsActions } from '@pages/commonActions';
import { getTranslations } from '@support/translations/getTranslations';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { VaultTranslations } from '@support/translations/selectors/explore/vault/vaultTranslations';

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');
const vaultTranslations: VaultTranslations = getTranslations('explore/vault', 'ES');

export class WebSdkHarnessPage extends CommonsActions {
  readonly page: Page;
  readonly iframeZoid: FrameLocator;
  readonly labelPaymentWidgetProcessor: Locator;
  readonly labelPaymentVaultProcessor: Locator;

  // Locators
  constructor(page: Page) {
    super(page);
    this.page = page;
    this.iframeZoid = page.locator('[data-testid="d_una_checkout"]').contentFrame();
    this.labelPaymentWidgetProcessor = page.getByText(checkoutTranslations.screenPaymentWidgetWithCash.payWithCash);
    this.labelPaymentVaultProcessor = page.getByText(vaultTranslations.screenVaultWidgetPage.titleMainView);
  }

  // Actions
  async goToHarness(version?: string) {
    let URL = 'https://cdn.stg.deuna.io/web-sdk/harness/index.html';
    if (version) URL += `?version=${version}`;
    await this.page.goto(URL);
  }

  // Asserts
  async assertPaymentWidgetProcessorTitle() {
    await this.ensureVisible(this.labelPaymentWidgetProcessor, { iframe: this.iframeZoid, timeout: 30000 })
  }

  async assertPaymentVaultProcessorTitle() {
    await this.ensureVisible(this.labelPaymentVaultProcessor, { iframe: this.iframeZoid, timeout: 30000 })
  }
}
