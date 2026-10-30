import { FrameworkPlugin } from '../interface';
import { WebSdkHarnessPage } from '@pages/checkout/websdk';
import { WebSDKClient } from '@support/clients/checkout/websdk';
import { WebSDKWidgetConfig } from '@support/clients/checkout/websdk/interfaces';

export class PluginCheckoutWebsdk extends FrameworkPlugin {
  pluginBaseName = 'checkout.websdk';

  private _harnessPage?: WebSdkHarnessPage;
  private _sdkClient?: WebSDKClient;

  get harnessPage(): WebSdkHarnessPage {
    if (!this._harnessPage) {
      this._harnessPage = new WebSdkHarnessPage(this.context.page);
    }
    return this._harnessPage;
  }

  get sdkClient(): WebSDKClient {
    if (!this._sdkClient) {
      this._sdkClient = new WebSDKClient(this.context.page);
    }
    return this._sdkClient;
  }

  /** @description Navigates to the WebSDK harness test application, optionally with a specific version. */
  async $tf_goToHarness({ version }: { version?: string } = {}) {
    await this.harnessPage.goToHarness(version);
  }

  /** @description Initializes the WebSDK client with the provided merchant public API key. */
  async $tf_init({ publicApiKey }: { publicApiKey: string }) {
    await this.sdkClient.init({ publicApiKey });
  }

  /** @description Opens the WebSDK Elements widget with the given configuration (orderToken, userToken, behavior, etc.). */
  async $tf_openElements(config: WebSDKWidgetConfig) {
    await this.sdkClient.openElements(config);
  }

  /** @description Opens the WebSDK Payment Widget with the given configuration (orderToken, language, etc.). */
  async $tf_openPaymentWidget(config: WebSDKWidgetConfig) {
    const localDomain = process.env.URL_CHECKOUT_BASE_LOCAL;
    await this.sdkClient.openPaymentWidget(
      localDomain ? { ...config, domain: localDomain } : config
    );
  }

  /** @description Asserts that the Payment Widget processor title is visible. */
  async $tf_assertPaymentWidgetProcessorTitle() {
    await this.harnessPage.assertPaymentWidgetProcessorTitle();
  }

  /** @description Asserts that the Payment Vault processor title is visible. */
  async $tf_assertPaymentVaultProcessorTitle() {
    await this.harnessPage.assertPaymentVaultProcessorTitle();
  }

  /** @description Navigates directly to a checkout URL (e.g. a payment link URL from the order response), bypassing the harness app. Use this to test session persistence when the checkout is opened via a redirect instead of the WebSDK harness. */
  async $tf_openCheckoutUrl({ url }: { url: string }) {
    await this.context.page.goto(url);
  }
}
