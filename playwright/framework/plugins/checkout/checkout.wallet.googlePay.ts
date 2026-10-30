import { Context, FrameworkPlugin } from '../interface';
import { GooglePayFormPage } from '@pages/explore/forms/googlePayFormPage';
import { installWalletMocks } from '@support/mocks/wallet/installWalletMocks';

export class PluginCheckoutWalletGooglePay extends FrameworkPlugin {
  pluginBaseName = 'checkout.wallet.googlePay';

  googlePayFormPage!: GooglePayFormPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.googlePayFormPage = new GooglePayFormPage(context.page);
  }

  /** @description Installs window-level + network mocks for Google Pay so the Payment Widget can mount the wallet button without loading the real pay.google.com SDK. Must be called before checkout.openCheckout. */
  async $tf_installMocks() {
    await installWalletMocks(this.context.page, { wallets: ['google_pay'] });
  }

  /** @description Clicks the Google Pay form option on the Formularios experience to choose google_pay as the single processor for the Payment Widget. */
  async $tf_selectForm() {
    await this.googlePayFormPage.selectGooglePayForm();
  }

  /** @description Clicks the Pay button on the Formularios page to open the Payment Widget restricted to the google_pay processor. */
  async $tf_clickPay() {
    await this.googlePayFormPage.clickPay();
  }

  /** @description Asserts that the Google Pay wallet button container has been mounted inside the Payment Widget iframe. */
  async $tf_assertWalletButtonVisible() {
    await this.googlePayFormPage.assertWalletButtonVisible();
  }

  /** @description Clicks the Google Pay button mounted inside the Payment Widget iframe. Triggers requestGooglePayment which resolves loadPaymentData against the mocked PaymentsClient. */
  async $tf_clickWalletButton() {
    await this.googlePayFormPage.clickWalletButton();
  }
}
