import { CommonsActions } from '@pages/commonActions';
import { expect, FrameLocator, Locator, Page } from '@deuna/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@support/translations/getTranslations';
import { SafetypayTranslations } from '@support/translations/selectors/safetypay/translations';

export class SafetypayPage extends CommonsActions {
  readonly selectors: SafetypayTranslations;

  safetyPayIframe: FrameLocator;
  safetyPayVoucherFrame: FrameLocator;
  widgetPage: FrameLocator;
  voucherPage: FrameLocator;
  buttonSeeOrderSummary: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);

    this.widgetPage = page.frameLocator('iframe.zoid-visible');
    // test id=> d_una_checkout

    this.buttonSeeOrderSummary = this.widgetPage.getByTestId('see_order_summary-button');
    this.selectors = getTranslations('safetypay', languageCode);
  }

  _getSafetyPayTranslation() {
    return this.selectors.screenSafetyPay;
  }

  async assertReferenceLoading() {
    const translation = this._getSafetyPayTranslation();
    await expect(this.widgetPage.getByText(translation.referenceLoading)).toBeVisible({
      timeout: 25_000,
    });
  }

  async waitForSafetyPayIframe() {
    const iframeSelector = 'iframe[src*="sandbox-gateway.safetypay.com"]';

    await expect(this.widgetPage.locator(iframeSelector)).toBeVisible({ timeout: 35_000 });
    this.safetyPayIframe = this.widgetPage.frameLocator(iframeSelector);
    await this.dismissInformativeNoteIfPresent();
  }

  /**
   * SafetyPay randomly shows a cookie consent note ("Nota informativa") right after the iframe renders.
   * When present, it overlays the voucher content and blocks subsequent assertions.
   * We use dispatchEvent instead of click because the close button (iubenda-cs-close-btn)
   * is positioned outside the iframe's visible viewport and Playwright cannot scroll to it
   * within the cross-origin iframe, causing "Element is outside of the viewport" errors.
   */
  async dismissInformativeNoteIfPresent() {
    const closeButton = this.safetyPayIframe.getByRole('button', {
      name: 'Cerrar esta nota informativa',
    });

    const isNoteVisible = await closeButton.isVisible({ timeout: 8_000 }).catch(() => false);

    if (isNoteVisible) {
      await closeButton.dispatchEvent('click');
    }
  }

  async waitSafetyPayVoucherFrame() {
    const voucherSelector = 'iframe.zoid-visible';
    const voucherLocator = await this.page.locator(voucherSelector);
    await expect(voucherLocator).toBeVisible({ timeout: 20_000 });
    this.voucherPage = this.page.frameLocator(voucherSelector);

    const iframeSelector = 'iframe[src*="sandbox-gateway.safetypay.com"]';
    await expect(this.voucherPage.locator(iframeSelector)).toBeVisible({ timeout: 20_000 });
    this.safetyPayVoucherFrame = this.voucherPage.frameLocator(iframeSelector);
  }

  /**
   * SafetyPay updated their UI and no longer shows the "Esperando confirmación de" text.
   * Instead, the voucher renders directly with an email input to send payment instructions.
   * We race both locators so the assertion passes regardless of which SafetyPay version loads.
   */
  async assertWaitingConfirmation() {
    const translation = this._getSafetyPayTranslation();
    const waitingText = this.safetyPayIframe.getByText(translation.waitingConfirmation);
    const emailInput = this.safetyPayIframe.locator(
      'input[type="email"], input[placeholder*="orreo"]'
    );

    await Promise.race([
      expect(waitingText).toBeVisible({ timeout: 40_000 }),
      expect(emailInput).toBeVisible({ timeout: 40_000 }),
    ]);
  }

  async clickButtonSeeOrderSummary() {
    await this.ensureVisibleToClick(this.buttonSeeOrderSummary);
  }

  async waitExploreThankYouPage() {
    const locator = this.page.locator('#successful_order_text');
    await expect(locator).toBeVisible({ timeout: 15_000 });
  }
}

export class SafetypayPaymentLinkPage extends SafetypayPage {
  divTransactionSteps: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page, languageCode);
  }

  overrideWidgetPage(page: Page) {
    this.widgetPage = page as unknown as FrameLocator;
    this.buttonSeeOrderSummary = this.widgetPage.getByTestId('see_order_summary-button');
    this.divTransactionSteps = this.widgetPage.locator('iframe[title="Payment Summary"]');
  }

  async assertTransactionSteps() {
    await expect(this.divTransactionSteps).toBeVisible({ timeout: 25_000 });
  }
}
