import { Context, FrameworkPlugin } from '../interface';
import { DaviplataFormPage } from '@pages/explore/forms/daviplataFormPage';

export class PluginCheckoutWalletDaviplata extends FrameworkPlugin {
  pluginBaseName = 'checkout.wallet.daviplata';

  daviplataPage!: DaviplataFormPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.daviplataPage = new DaviplataFormPage(context.page);
  }

  /** @description Fills the document number input in the Daviplata form and verifies the value. */
  async $tf_fillDocumentNumber(params?: { number?: string }) {
    await this.daviplataPage.fillDocumentNumber(params?.number);
  }

  /** @description Enters the OTP code into the Daviplata OTP input field. */
  async $tf_enterOtpCode(params?: { codeOTP?: string }) {
    await this.daviplataPage.enterOtpCode(params?.codeOTP);
  }

  /** @description Clicks the resend OTP code button and waits for the purchase response. */
  async $tf_resendOtpCode() {
    await this.daviplataPage.resendOtpCode();
  }

  /** @description Asserts that the document number input is visible in the Daviplata form. */
  async $tf_assertDocumentNumberVisible() {
    this.daviplataPage.assertDocumentNumberToBeVisible();
  }

  /** @description Asserts that the document number input is hidden in the Daviplata form. */
  async $tf_assertDocumentNumberHidden() {
    this.daviplataPage.assertDocumentNumbertoBeHidden();
  }

  /** @description Asserts that the OTP code sent confirmation label is visible in the Daviplata form. */
  async $tf_assertOtpCodeSentVisible() {
    this.daviplataPage.assertOtpCodeSentToBeVisible();
  }
}
