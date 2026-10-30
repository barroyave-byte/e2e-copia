import { Context, FrameworkPlugin } from '../interface';
import { ReferencePayModalPage } from '@pages/explore/forms/oxxo/referecePayModalPage';

export class PluginCheckoutVoucherOxxo extends FrameworkPlugin {
  pluginBaseName = 'checkout.voucher.oxxo';

  referencePayModalPage!: ReferencePayModalPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.referencePayModalPage = new ReferencePayModalPage(context.page);
  }

  /** @description Asserts that the amount displayed in the OXXO voucher header matches the expected formatted value. */
  async $tf_assertAmountToPay(params: { formatedValue: string }) {
    await this.referencePayModalPage.assertAmountToPay(params.formatedValue);
  }

  /** @description Asserts that the barcode canvas element is visible in the OXXO voucher. */
  async $tf_assertBarCodeDisplayed() {
    await this.referencePayModalPage.assertBarCodeIsDisplayed();
  }

  /** @description Asserts that the reference number is visible and not empty in the OXXO voucher. */
  async $tf_assertReferenceNumberDisplayed() {
    await this.referencePayModalPage.assertReferenceNumberIsDisplayed();
  }

  /** @description Asserts that the copy reference code button is visible and enabled in the OXXO voucher. */
  async $tf_assertCopyButtonDisplayed() {
    await this.referencePayModalPage.assertCopyButtonIsDisplayed();
  }

  /** @description Asserts that the deadline date is displayed with the expected date/time/country format in the OXXO voucher. */
  async $tf_assertDeadlineDateCurrentTime() {
    await this.referencePayModalPage.assertDeadlineDateCurrentTimeIsDisplayed();
  }

  /** @description Reads the deadline date label from the OXXO voucher and returns it as an ISO string. */
  async $tf_getDeadlineDateIso() {
    return await this.referencePayModalPage.getDeadlineDateIso();
  }

  /** @description Expands the instructions section and asserts that all 6 payment instruction texts are displayed correctly. */
  async $tf_assertInstructionsTextDisplayed() {
    await this.referencePayModalPage.assertInstructionsTextIsDisplay();
  }

  /** @description Collapses the instructions section and asserts that all 6 payment instruction texts are no longer visible. */
  async $tf_assertInstructionsTextNotDisplayed() {
    await this.referencePayModalPage.assertInstructionsTextIsNotDisplay();
  }

  /** @description Downloads the OXXO payment reference PDF and asserts that it contains the expected text. */
  async $tf_assertDownloadingPaymentReference(params: { textToVerify: string }) {
    await this.referencePayModalPage.assertDownloadingPaymentReference(params.textToVerify);
  }

  /** @description Clicks the download reference button and returns the download event object. */
  async $tf_downloadReference() {
    return await this.referencePayModalPage.downloadReference();
  }

  /** @description Saves a downloaded PDF to disk, parses its content, and asserts it contains the expected text. */
  async $tf_assertContentDownloadedPdfFile(params: { download: any; textToVerify: string }) {
    await this.referencePayModalPage.assertContentDownloadedPdfFile(
      params.download,
      params.textToVerify
    );
  }

  /** @description Clicks the payment details button in the OXXO voucher. */
  async $tf_goToPaymentDetails() {
    await this.referencePayModalPage.goToPaymentDetails();
  }

  /** @description Clicks the payment details button and asserts the opened popup page matches the expected URL. */
  async $tf_assertPaymentDetails(params: { paymentDetailsUrl: string }) {
    await this.referencePayModalPage.assertPaymentDetails(params.paymentDetailsUrl);
  }

  /** @description Clicks the order summary button and asserts the pending payment label is visible on the thank-you page. */
  async $tf_assertThankYouPage() {
    await this.referencePayModalPage.assertThankYouPage();
  }

  /** @description Asserts that the OXXO error screen is displayed with error message and description. */
  async $tf_assertErrorScreen() {
    await this.referencePayModalPage.assertErrorScreen();
  }

  /** @description Asserts that the OXXO error code (DP-7100) is visible on the error screen. */
  async $tf_assertErrorIdDisplayed() {
    await this.referencePayModalPage.assertErrorIdDisplayed();
  }

  /** @description Asserts that the back button is visible on the OXXO error screen. */
  async $tf_assertBackButtonDisplayed() {
    await this.referencePayModalPage.assertBackButtonDisplayed();
  }

  /** @description Asserts that the error screen back button is functional and returns to the payment method selection screen. */
  async $tf_assertBackButtonWorks() {
    await this.referencePayModalPage.assertBackButtonWorks();
  }

  /** @description Asserts that the OXXO voucher header title has the expected text. */
  async $tf_assertHeaderTitle(params: { title: string }) {
    await this.referencePayModalPage.assertHeaderTitle(params.title);
  }
}
