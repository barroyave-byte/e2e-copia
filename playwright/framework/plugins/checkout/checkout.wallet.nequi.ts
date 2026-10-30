import { Context, FrameworkPlugin } from '../interface';
import { NequiPushFormPage } from '@pages/explore/forms/nequiPushFormPage';

export interface InterceptorRequest {
  status: number;
  body: any;
}

export class PluginCheckoutWalletNequi extends FrameworkPlugin {
  pluginBaseName = 'checkout.wallet.nequi';

  nequiPage!: NequiPushFormPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.nequiPage = new NequiPushFormPage(context.page);
  }

  /** @description Waits until the Nequi phone number input is visible, indicating the page has loaded. */
  async $tf_waitUntilLoadPage() {
    await this.nequiPage.waitUntilLoadPage();
  }

  /** @description Fills the phone number input in the Nequi push form and verifies the value. */
  async $tf_fillPhoneNumber(params?: { phone?: string }) {
    await this.nequiPage.fillPhoneNumber(params?.phone);
  }

  /** @description Sets up an interceptor to capture the next Nequi push verify response. */
  async $tf_waitForNequiPushVerifyResponse() {
    await this.nequiPage.waitForNequiPushVerifyResponse();
  }

  /** @description Sets up an interceptor that waits for a Nequi push verify response with order status succeeded. */
  async $tf_waitForNequiPushVerifySucceededResponse() {
    await this.nequiPage.waitForNequiPushVerifySucceededResponse();
  }

  /** @description Intercepts the Nequi push verify endpoint and returns a mocked response with the given status and body. */
  async $tf_interceptVerifyResponse(params: {
    interceptorRequest: InterceptorRequest;
    times?: number;
  }) {
    await this.nequiPage.interceptVerifyResponse(params.interceptorRequest, params.times);
  }

  /** @description Intercepts the Nequi verify endpoint to simulate a webhook flow: first call returns pending, subsequent calls return success. */
  async $tf_interceptVerifyWebhookFlow(params: { pendingBody: any; successBody: any }) {
    await this.nequiPage.interceptVerifyWebhookFlow(params.pendingBody, params.successBody);
  }

  /** @description Asserts that the captured Nequi push verify response has order status succeeded. */
  async $tf_assertNequiPushVerifyOrderStatus() {
    await this.nequiPage.assertNequiPushVerifyOrderStatus();
  }

  /** @description Asserts that the phone verification confirmation text is visible in the Nequi push flow. */
  async $tf_assertPhoneVerificationPageVisible() {
    await this.nequiPage.assertPhoneVerificationPageToBeVisible();
  }

  /** @description Asserts that the phone number input is visible in the Nequi push form. */
  async $tf_assertPhoneNumberVisible() {
    await this.nequiPage.assertPhoneNumberToBeVisible();
  }

  /** @description Asserts that the DEUNA powered-by logo is visible on the Nequi page. */
  async $tf_assertDEUNALogoVisible() {
    await this.nequiPage.assertDEUNALogoToBeVisible();
  }
}
