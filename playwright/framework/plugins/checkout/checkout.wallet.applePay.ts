import { Context, FrameworkPlugin } from '../interface';
import { ApplePayFormPage } from '@pages/explore/forms/applePayFormPage';
import { installWalletMocks } from '@support/mocks/wallet/installWalletMocks';

export class PluginCheckoutWalletApplePay extends FrameworkPlugin {
  pluginBaseName = 'checkout.wallet.applePay';

  applePayFormPage!: ApplePayFormPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.applePayFormPage = new ApplePayFormPage(context.page);
  }

  /** @description Installs window-level + network mocks for Apple Pay so the Payment Widget can mount the wallet button without real ApplePaySession or merchant validation. Must be called before checkout.openCheckout. */
  async $tf_installMocks() {
    await installWalletMocks(this.context.page, { wallets: ['apple_pay'] });
  }

  /** @description Clicks the Apple Pay form option on the Formularios experience to choose apple_pay as the single processor for the Payment Widget. */
  async $tf_selectForm() {
    await this.applePayFormPage.selectApplePayForm();
  }

  /** @description Clicks the Pay button on the Formularios page to open the Payment Widget restricted to the apple_pay processor. */
  async $tf_clickPay() {
    await this.applePayFormPage.clickPay();
  }

  /** @description Asserts that the Apple Pay wallet button container has been mounted inside the Payment Widget iframe. */
  async $tf_assertWalletButtonVisible() {
    await this.applePayFormPage.assertWalletButtonVisible();
  }

  /** @description Clicks the Apple Pay button mounted inside the Payment Widget iframe. Triggers requestApplePayment against the mocked ApplePaySession. */
  async $tf_clickWalletButton() {
    await this.applePayFormPage.clickWalletButton();
  }

  /** @description Invokes the Apple Pay mock authorize() helper so the session synchronously fires onvalidatemerchant and onpaymentauthorized with a successful payment payload. */
  async $tf_triggerSuccessAuthorization() {
    await this.applePayFormPage.triggerSuccessAuthorization();
  }
}
