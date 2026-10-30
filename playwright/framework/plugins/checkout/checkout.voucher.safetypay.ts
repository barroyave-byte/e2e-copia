import { Context, FrameworkPlugin } from '../interface';
import { VoucherProcessorsPage, VoucherProcessors } from '@pages/voucher/voucherProcessors';
import { BrowserContext } from '@playwright/test';

export class PluginCheckoutVoucherSafetypay extends FrameworkPlugin {
  pluginBaseName = 'checkout.voucher.safetypay';

  voucherPage!: VoucherProcessorsPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.voucherPage = new VoucherProcessorsPage(context.page);
  }

  /** @description Waits for the SafetyPay embedded iframe to become visible within the voucher frame. */
  async $tf_waitForSafetyPayIframe() {
    await this.voucherPage.waitForSafetyPayIframe();
  }

  // NOTE: assertReferenceLoading, assertWaitingConfirmation, clickButtonSeeOrderSummary and
  // waitExploreThankYouPage were removed from the catalog: they were registered but threw
  // 'Not yet connected to page object' on every call. Working implementations exist on
  // SafetypayPage (@pages/checkout/safetypay), but that page object resolves the SafetyPay
  // iframe from the widget page while this plugin resolves it from the voucher frame
  // (VoucherProcessorsPage), so the iframe state is not interchangeable between them.
  // Wiring them requires picking one page object for the whole plugin — see ENTP1-T2428/2429
  // for the raw-Playwright flow that should drive that decision.

  /** @description Opens the SafetyPay processor accordion by clicking its title in the voucher frame. */
  async $tf_openProcessorAccordion(params: { processorId: string }) {
    await this.voucherPage.openProcessorAccordion(params.processorId);
  }

  /** @description Extracts the transaction code and total amount from the SafetyPay iframe for use in the sandbox bank. */
  async $tf_extractDataToCompleteTransaction() {
    await this.voucherPage.extractDataToCompleteTransaction();
  }

  /** @description Asserts the SafetyPay iframe shows the payment confirmed redirecting message. */
  async $tf_assertRedirectingAfterPaymentConfirmation() {
    await this.voucherPage.assertRedirectingAfterPaymentConfirmation();
  }

  /** @description Asserts that the SafetyPay redirect-to-commerce processing view is visible. */
  async $tf_assertRedirectToCommerceView() {
    await this.voucherPage.assertRedirectToCommerceView();
  }

  /** @description Asserts that the shield lock security icon is visible in the SafetyPay iframe. */
  async $tf_assertShieldLockIsVisible() {
    await this.voucherPage.assertShieldLockIsVisible();
  }

  /** @description Clicks the pay button in the SafetyPay iframe, accepting terms and conditions if present first. */
  async $tf_clickPayInSafetyPay() {
    await this.voucherPage.clickOnPayInSafetyPay();
  }

  /** @description Waits for the external SafetyPay bank login popup to open. */
  async $tf_waitForExternalSafetyPayBankView() {
    await this.voucherPage.waitForExternalSafetyPayBankView();
  }

  /** @description Opens the SafetyPay sandbox demo bank page in a new tab. */
  async $tf_openSandboxDemoBankPage(params: { context: BrowserContext }) {
    await this.voucherPage.openSandboxDemoBankSafetyPayPage(params.context);
  }

  /** @description Fills the credentials and logs in to the SafetyPay sandbox demo bank. */
  async $tf_loginSandboxDemoBankCredentials() {
    await this.voucherPage.loginSandboxDemoBankCredentials();
  }

  /** @description Confirms the transaction on the SafetyPay sandbox demo bank and asserts the operation was successful. */
  async $tf_confirmTransaction() {
    await this.voucherPage.confirmTransaction();
  }

  /** @description Closes the SafetyPay sandbox demo bank page tab. */
  async $tf_closeSandboxDemoBankPage() {
    await this.voucherPage.closeSandboxDemoBankPage();
  }

  /** @description Closes the SafetyPay bank login popup window. */
  async $tf_closeBankLoginPopup() {
    await this.voucherPage.closeBankLoginPopup();
  }

  /** @description Clicks the cancel button in the SafetyPay voucher frame. */
  async $tf_clickCancelButton() {
    await this.voucherPage.clickOnCancelButton();
  }

  /** @description Asserts that the specified processor titles are visible in the SafetyPay voucher frame. */
  async $tf_assertTitleProcessors(params?: { processorIds?: string[] }) {
    await this.voucherPage.assertTitleProcessors(params?.processorIds);
  }

  /** @description Asserts that the specified processor accordion is open/checked in the SafetyPay voucher. */
  async $tf_assertProcessorAccordionOpen(params: { processorId: string }) {
    await this.voucherPage.assertProcessorAccordionOpen(params.processorId);
  }

  /** @description Asserts that the processor content (title, description, reference title) is visible for the given SafetyPay processor. */
  async $tf_assertProcessorContentVisible(params: { processorId: VoucherProcessors }) {
    await this.voucherPage.assertProcessorContentVisible(params.processorId);
  }

  /** @description Asserts that the specified processor title is not visible in the SafetyPay voucher. */
  async $tf_assertProcessorTitleHidden(params: { processorId: string }) {
    await this.voucherPage.assertProcessorTitleIsHidden(params.processorId);
  }

  /** @description Asserts that all voucher sections (header, body, due date, footer) are hidden. */
  async $tf_assertVoucherHidden() {
    await this.voucherPage.assertVoucherIsHidden();
  }

  /** @description Asserts that the success alert notification in the SafetyPay voucher frame has the expected text. */
  async $tf_assertSuccessAlertNotification(params: { text: string }) {
    await this.voucherPage.assertSuccessAlertNotification(params.text);
  }
}
