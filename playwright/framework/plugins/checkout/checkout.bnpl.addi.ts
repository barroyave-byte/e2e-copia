import { Page } from '@playwright/test';
import { Context, FrameworkPlugin } from '../interface';
import { AddiRedirectPage } from '@pages/bnpl/addiPage';
import { AddiFormPage } from '@pages/explore/forms/addi/addiFormPage';
import { AddiReferencePayModalPage } from '@pages/explore/forms/addi/addiReferencePayModalPage';
import { verifyIframeBodyVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';

type ViewportSetKey = keyof typeof commonViewportSets;

export interface WaitRemoteTranslationsParams {
  projectName: string;
  lang: 'es' | 'pt' | 'en';
}

declare global {
  interface Window {
    android?: {
      postMessage: (message: string) => void;
    };
  }
}

export class PluginCheckoutBnplAddi extends FrameworkPlugin {
  pluginBaseName = 'checkout.bnpl.addi';

  pageObject!: AddiRedirectPage;
  formPage!: AddiFormPage;
  referenceModal!: AddiReferencePayModalPage;
  private popupPromise: Promise<Page> | undefined;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.pageObject = new AddiRedirectPage(context.page);
    this.formPage = new AddiFormPage(context.page);
    this.referenceModal = new AddiReferencePayModalPage(context.page);
    this.popupPromise = undefined;
  }

  /** @description Injects a no-op Android WebView bridge (window.android) via page.addInitScript so the checkout can detect a native mobile environment. Must be called before navigation. */
  async $tf_injectMobileBridge() {
    await this.context.page.addInitScript(() => {
      window.android = {
        postMessage: (message: string) => {
          // eslint-disable-next-line no-console
          console.log('Mobile bridge message:', message);
        },
      };
    });
  }

  /** @description Selects the Addi option in the Formularios payment methods list. */
  async $tf_selectAddiForm() {
    await this.formPage.selectAddiForm();
  }

  /** @description Registers a watcher for the remote translations response for the given project and language. Pair with assertRemoteTranslations after the request completes. */
  async $tf_waitRemoteTranslations({ projectName, lang }: WaitRemoteTranslationsParams) {
    this.formPage.remoteTranslations.waitResponseFromRemoteTranslations({ projectName, lang });
  }

  /** @description Clicks the Pay button in the Formularios Addi flow. Also sets up a popup listener to capture the Addi redirect popup that opens after submission. */
  async $tf_clickPayForm() {
    this.popupPromise = this.context.page.waitForEvent('popup');
    await this.formPage.clickPay();
  }

  /** @description Clicks "Embedir Pago" to embed the Addi reference form inline in the Formularios view, hides the footer overlay, scrolls to the embed container, and waits for the embedded reference form to be visible. */
  async $tf_clickEmbedPay() {
    await this.formPage.clickEmbedPay();
    await this.context.page.evaluate(() => {
      const footer = document.getElementById('footer');
      if (footer) footer.style.display = 'none';
    });
    await this.formPage.scrollToEmbedContainer();
    await this.referenceModal.waitUntilVisible();
  }

  /** @description Fills the Addi customer reference data form embedded inline in the Formularios view (document, phone, address, department, city). */
  async $tf_fillReferenceModal() {
    await this.referenceModal.fillFormData();
  }

  /** @description Clicks the Pay button of the embedded Addi reference form with no data filled, to trigger field validation errors. */
  async $tf_submitEmptyReferenceForm() {
    await this.referenceModal.submitEmptyForm();
  }

  /** @description Asserts that field validation error messages are visible in the embedded Addi reference form. */
  async $tf_assertReferenceFormValidationErrors() {
    await this.referenceModal.assertValidationErrorsVisible();
  }

  /** @description Clicks the Pay button in the Addi reference data modal and asserts the purchase response. */
  async $tf_clickReferenceModalPay() {
    await this.referenceModal.clickOnPay();
  }

  /** @description Captures a visual snapshot of the embedded Addi reference form (inline in Formularios, not a popup) across the specified viewport set. */
  async $tf_verifyFormVisualConsistency(params: {
    snapshotName: string;
    viewports?: ViewportSetKey;
  }) {
    await verifyIframeBodyVisualConsistency({
      page: this.context.page,
      frameLocator: this.referenceModal.iframeZoidVisible,
      snapshotName: params.snapshotName,
      viewports: commonViewportSets[params.viewports ?? 'desktopOnly'],
    });
  }

  /** @description Asserts that the remote translations response previously registered by waitRemoteTranslations is non-empty. */
  async $tf_assertRemoteTranslations() {
    await this.formPage.remoteTranslations.assertRemoteTranslations();
  }

  /** @description Awaits the Addi redirect popup opened by clickPayForm and asserts its landing page is visible. */
  async $tf_assertAddiPopupVisible() {
    if (!this.popupPromise) {
      throw new Error(
        'Addi popup was not registered. Call clickPayForm before assertAddiPopupVisible.'
      );
    }
    const popup = await this.popupPromise;
    const addiRedirectPage = new AddiRedirectPage(popup);
    await addiRedirectPage.assertAddiPage();
  }

  /** @description Waits for the Addi landing page to fully load, asserts the heading is visible, and clicks the continue button. */
  async $tf_seeAddiLandingPageAndContinue() {
    await this.pageObject.assertAddiPage();
  }

  /** @description Clicks the debit with PSE option on the Addi payment method selection screen. */
  async $tf_selectDebitWithPSE() {
    await this.pageObject.selectDebitWithPSE();
  }

  /** @description Opens the bank selector and chooses the bank that approves the transaction for testing approved flow. */
  async $tf_selectApproveBank() {
    await this.pageObject.selectApproveBank();
  }

  /** @description Opens the bank selector and chooses the bank that declines the transaction for testing declined flow. */
  async $tf_selectDeclineBank() {
    await this.pageObject.selectDeclineBank();
  }

  /** @description Opens the bank selector and chooses the bank that simulates an error for testing error flow. */
  async $tf_selectErrorBank() {
    await this.pageObject.selectErrorBank();
  }

  /** @description Fills the PSE payment form with test user data including full name, ID number, and email. */
  async $tf_fillUserData() {
    await this.pageObject.fillUserData();
  }

  /** @description Clicks the pay with PSE button to submit the payment form. */
  async $tf_sendPayment() {
    await this.pageObject.sendPayment();
  }

  /** @description Clicks the cancel icon and confirms exit to cancel the Addi purchase flow. */
  async $tf_cancelPurchase() {
    await this.pageObject.cancelPurchase();
  }

  /** @description Asserts that the PSE payment form is visible on the Addi redirect page. */
  async $tf_assertPaymentFormVisible() {
    await this.pageObject.assertPaymentFormMustBeVisible();
  }

  /** @description Waits for the Addi popup page to close, with an optional timeout in milliseconds. */
  async $tf_waitForClose(params?: { timeout?: number }) {
    await this.pageObject.waitForClose(params?.timeout);
  }
}
