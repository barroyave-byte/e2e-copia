import { FrameLocator, expect } from '@playwright/test';
import { Context, FrameworkPlugin } from '../interface';
import { FintocFormPage } from '@pages/explore/forms/fintocFormPage';
import { FintocPopupPage } from '@pages/explore/forms/fintocPopupPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';

export interface FintocLoginParams {
  rut: string;
  password: string;
}

export interface FintocSelectBankParams {
  bankName: string;
}

/**
 * Fintoc APM plugin — embedded flow.
 *
 * Fintoc now renders its wizard inside the payment widget as a nested iframe
 * (engineType: "embedded" in the declarative APM manifest). No popup window
 * is opened by DEUNA's code. The Fintoc SDK may briefly attempt to open
 * pay.fintoc.com in a popup, but COOP: same-origin severs the reference
 * immediately and the SDK falls back to rendering in the mount container.
 *
 * Frame path from the main page:
 *   iframe.zoid-visible          ← checkout widget
 *   └── [data-testid="embedded-apm-iframe"]   ← DeclarativeApmEmbeddedView iframe
 *        └── iframe              ← Fintoc SDK wizard (wizard.fintoc.com)
 */
export class PluginCheckoutApmFintoc extends FrameworkPlugin {
  pluginBaseName = 'checkout.apm.fintoc';

  formPage!: FintocFormPage;
  popupPage!: FintocPopupPage;
  private embeddedApmFrame: FrameLocator | undefined;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.formPage = new FintocFormPage(context.page);
    this.embeddedApmFrame = undefined;
  }

  private getEmbeddedApmFrame(): FrameLocator {
    if (!this.embeddedApmFrame) {
      throw new Error(
        'Fintoc embedded wizard not initialized. Call assertFintocPopupVisible first.'
      );
    }
    return this.embeddedApmFrame;
  }

  private getWizardFrame(): FrameLocator {
    return this.getEmbeddedApmFrame().frameLocator('iframe');
  }

  /** @description Asserts that Fintoc info title and subtitle are visible in the widget. */
  async $tf_assertFintocInfoVisible() {
    await this.formPage.assertFintocInfoVisible();
  }

  /**
   * @description Clicks the Pay button. Fintoc will load its wizard inside the
   * embedded APM iframe — no popup interaction needed.
   */
  async $tf_clickPayForm() {
    await this.formPage.clickPay();
  }

  /**
   * @description Waits for the embedded Fintoc wizard to appear inside the payment
   * widget iframe and verifies the bank selection screen is ready.
   *
   * Despite the legacy name ("popup"), Fintoc now runs fully embedded.
   */
  async $tf_assertFintocPopupVisible() {
    const widgetFrame = this.context.page.frameLocator('iframe.zoid-visible');
    const embeddedFrame = widgetFrame.frameLocator('[data-testid="embedded-apm-iframe"]');

    this.embeddedApmFrame = embeddedFrame;
    this.popupPage = new FintocPopupPage(this.context.page, this.getWizardFrame());

    // Wait for Fintoc SDK to mount and render the bank list in the wizard iframe.
    await this.popupPage.waitForBankList();
  }

  /** @description Selects a bank by name in the Fintoc bank selection screen. */
  async $tf_selectBank(_params: FintocSelectBankParams) {
    await this.popupPage.selectBank(_params.bankName);
  }

  /** @description Fills RUT and password in the Fintoc login screen and submits. */
  async $tf_login(params: FintocLoginParams) {
    await this.popupPage.login(params.rut, params.password);
  }

  /** @description Waits up to 30s for the Fintoc account selection screen and clicks Continuar. */
  async $tf_selectAccountAndContinue() {
    await this.popupPage.waitForAccountSelectionAndContinue();
  }

  /**
   * @description Handles Fintoc second-factor: coordinates (3 inputs), SMS OTP (4 inputs),
   * or mobile-app auth (no inputs — returns immediately). All variants run inside the wizard iframe.
   */
  async $tf_completeSecondFactor() {
    await this.popupPage.completeSecondFactor();
  }

  /** @description No-op — kept for DSL compatibility. Fintoc no longer uses a popup window. */
  async $tf_closeFintocPopup() {
    // Fintoc is now fully embedded; no popup to close.
  }

  /** @description No-op — kept for DSL compatibility. Fintoc no longer uses a popup window. */
  async $tf_waitForFintocPopupClose() {
    // Fintoc is now fully embedded; no popup close event to await.
  }

  /** @description Selects Fintoc in the forms payment method list and opens the embedded checkout. */
  async $tf_selectFintocForm() {
    await this.formPage.selectFintocForm();
  }

  /**
   * @description Clicks the back button in the EmbeddedApmModal header (TopBar).
   * Used to dismiss the embedded Fintoc view and trigger widget close in the forms flow.
   *
   * The EmbeddedApmModal's TopBar button has no data-testid (TopBar.tsx renders
   * Icon without one). We navigate via XPath from the iframe container to find the
   * button in the preceding sibling (modal header Flex). getByTestId('arrow_back_ios')
   * would find the wrong button — the Areas/Top.tsx one that is hidden behind the modal.
   */
  async $tf_clickEmbeddedBack() {
    const widgetFrame = this.context.page.frameLocator('iframe.zoid-visible');
    const backBtn = widgetFrame
      .locator('[data-testid="embedded-apm-iframe-container"]')
      .locator('xpath=preceding-sibling::*//button');
    await expect(backBtn, 'EmbeddedApm back button did not appear in the modal header').toBeVisible(
      {
        timeout: 15000,
      }
    );
    await backBtn.click();
  }

  /**
   * @description Asserts the checkout widget iframe has closed (hidden) after dismissing
   * the embedded Fintoc view via the back button in the forms flow.
   */
  async $tf_assertWidgetClosed() {
    await expect(
      this.context.page.locator('iframe.zoid-visible'),
      'Checkout widget iframe did not close after dismissing embedded Fintoc'
    ).toBeHidden({ timeout: 15000 });
  }

  /** @description Waits for the explore-deuna merchant success page after the redirect engine completes. */
  async $tf_assertExploreSuccessPage() {
    await expect(
      this.context.page.locator('#successful_order_text'),
      'Explore merchant success page did not appear after Fintoc redirect'
    ).toBeVisible({ timeout: 180000 });
  }
}
