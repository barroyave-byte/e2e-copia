import { Context, FrameworkPlugin } from '../interface';
import { KlapEdenredPage } from '@pages/checkout/klap/klapEdenredPage';
import { KlapSodexoPage } from '@pages/checkout/klap/klapSodexoPage';
import { KlapFormPage } from '@pages/explore/forms/klapFormPage';

export class PluginCheckoutVoucherKlap extends FrameworkPlugin {
  pluginBaseName = 'checkout.voucher.klap';

  klapEdenredPage!: KlapEdenredPage;
  klapSodexoPage!: KlapSodexoPage;
  klapFormPage!: KlapFormPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.klapEdenredPage = new KlapEdenredPage(context.page);
    this.klapSodexoPage = new KlapSodexoPage(context.page);
    this.klapFormPage = new KlapFormPage(context.page);
  }

  /** @description Fills the Klap Edenred login credentials (username and password) in the Edenred portal. */
  async $tf_fillDataToLogin() {
    await this.klapEdenredPage.fillDataToLogin();
  }

  /** @description Clicks the login button on the Klap Edenred portal. */
  async $tf_login() {
    await this.klapEdenredPage.login();
  }

  /** @description Fills the PAN (card number suffix) input in the Klap Edenred portal. */
  async $tf_fillPan(params?: { pan?: string }) {
    await this.klapEdenredPage.fillPan(params?.pan);
  }

  /** @description Clicks the validate button after entering the PAN in the Klap Edenred portal. */
  async $tf_validatePan() {
    await this.klapEdenredPage.validatePan();
  }

  /** @description Clicks the allow button to grant Klap access to the Edenred network. */
  async $tf_allowedKlapToEdenredNetworkMe() {
    await this.klapEdenredPage.allowedKlapToEdenredNetworkMe();
  }

  /** @description Fills the dynamic key/password input in the Klap Sodexo payment form. */
  async $tf_fillInputPassword(params?: { password?: string }) {
    await this.klapSodexoPage.fillInputPassword(params?.password);
  }

  /** @description Clicks the pay button in the Klap Sodexo payment form, handling disabled state gracefully. */
  async $tf_clickPay() {
    await this.klapSodexoPage.clickOnPay();
  }

  /** @description Clicks the redirect-to-commerce button in the Klap Sodexo flow if visible. */
  async $tf_clickRedirectToCommerce() {
    await this.klapSodexoPage.clickOnRedirectToCommerce();
  }

  /** @description Asserts that the Klap Sodexo pay button is enabled. */
  async $tf_assertButtonPayAvailable() {
    await this.klapSodexoPage.assertButtonPayAvailable();
  }

  /** @description Clicks the back button in the Klap form iframe. */
  async $tf_clickBack() {
    await this.klapFormPage.clickOnBack();
  }

  /** @description Clicks the cancel/change-method button in the Klap form and asserts the iframe is closed. */
  async $tf_cancelPurchase() {
    await this.klapFormPage.cancelPurchase();
  }

  /** @description Asserts that the Klap error message label is visible in the form iframe. */
  async $tf_assertLabelErrorMessageVisible() {
    await this.klapFormPage.assertLabelErrorMessageVisible();
  }

  /** @description Asserts that the processing order label is visible in the Klap form iframe. */
  async $tf_assertLabelProcessingOrderVisible() {
    await this.klapFormPage.assertLabelProcessingOrderVisible();
  }

  /** @description Asserts that the redirecting-to-site label is visible in the Klap form iframe. */
  async $tf_assertLabelRedirectingToSiteVisible() {
    await this.klapFormPage.assertLabelRedirectingToSiteVisible();
  }

  /** @description Asserts that the processing payment label is visible in the Klap form iframe. */
  async $tf_assertLabelProcessingPaymentVisible() {
    await this.klapFormPage.assertLabelProcessingPaymentVisible();
  }

  /** @description Asserts that the Klap warning alert notification has the expected text. */
  async $tf_assertAlertNotification(params: { text: string }) {
    await this.klapFormPage.assertAlertNotification(params.text);
  }
}
