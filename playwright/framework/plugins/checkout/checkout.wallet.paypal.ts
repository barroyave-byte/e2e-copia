import { Context, FrameworkPlugin } from '../interface';
import { PayPalPage } from '@pages/wallet/paypalPage';

export class PluginCheckoutWalletPaypal extends FrameworkPlugin {
  pluginBaseName = 'checkout.wallet.paypal';

  paypalPage!: PayPalPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.paypalPage = new PayPalPage(context.page);
  }

  /** @description Fills the email input on the PayPal login page. */
  async $tf_insertEmail(params: { email: string }) {
    await this.paypalPage.insertEmail(params.email);
  }

  /** @description Fills the password input on the PayPal login page. */
  async $tf_insertPassword(params: { password: string }) {
    await this.paypalPage.insertPassword(params.password);
  }

  /** @description Logs in to PayPal for a checkout flow by entering email, password, and clicking the login button. */
  async $tf_loginCheckout(params: { email: string; password: string }) {
    await this.paypalPage.loginCheckout(params.email, params.password);
  }

  /** @description Logs in to PayPal for a vaulting flow by entering email, clicking continue, then entering password. */
  async $tf_loginVaulting(params: { email: string; password: string }) {
    await this.paypalPage.loginVaulting(params.email, params.password);
  }

  /** @description Fills the OTP code field and submits it during the PayPal login verification step. */
  async $tf_insertOtp(params?: { otpCode?: string }) {
    await this.paypalPage.insertOtp(params?.otpCode);
  }

  /** @description Clicks the PayPal payment submit button to initiate the payment. */
  async $tf_clickPaymentButton() {
    await this.paypalPage.clickOnPaymentButton();
  }

  /** @description Clicks the PayPal consent button to authorize the payment. */
  async $tf_clickConsentButton() {
    await this.paypalPage.clickOnConsentButton();
  }

  /** @description Clicks the return-to-store/cancel button on the PayPal page. */
  async $tf_clickReturnToStoreButton() {
    await this.paypalPage.clickOnReturnToStoreButton();
  }

  /** @description Selects the 1x installment option in the PayPal checkout installments selector. */
  async $tf_selectCheckoutInstallments() {
    await this.paypalPage.selectCheckoutInstallments();
  }

  /** @description Closes the current PayPal page (used for popup flows). */
  async $tf_closePage() {
    await this.paypalPage.closePage();
  }

  /** @description Asserts that the current URL corresponds to the PayPal sandbox checkout experience page. */
  async $tf_assertPayPalCheckoutExperiencePage() {
    await this.paypalPage.assertPayPalCheckoutExperiencePage();
  }

  /** @description Asserts that the current URL corresponds to the PayPal sandbox vaulting/agreements experience page. */
  async $tf_assertPayPalVaultingExperiencePage() {
    await this.paypalPage.assertPayPalVaultingExperiencePage();
  }

  /** @description Asserts that the redirect page main text matches the expected string. */
  async $tf_assertRedirectPage(params: { text: string }) {
    await this.paypalPage.assertRedirectPage(params.text);
  }
}
