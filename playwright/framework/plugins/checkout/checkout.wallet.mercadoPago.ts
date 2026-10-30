import { Context, FrameworkPlugin } from '../interface';
import { MercadoPagoWalletPage } from '@pages/explore/forms/mercadoPagoWalletpage';
import { MercadoPagoWalletCardDetails } from '@support/interfaces/credit_cards';

export class PluginCheckoutWalletMercadoPago extends FrameworkPlugin {
  pluginBaseName = 'checkout.wallet.mercadoPago';

  mercadoPagoPage!: MercadoPagoWalletPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.mercadoPagoPage = new MercadoPagoWalletPage(context.page);
  }

  /** @description Logs in to MercadoPago by submitting email (with retry) and then password. */
  async $tf_login(params: { credentials: { email: string; password: string } }) {
    await this.mercadoPagoPage.login(params.credentials);
  }

  /** @description Fills the email input on the MercadoPago login page. */
  async $tf_enterEmail(params: { email: string }) {
    await this.mercadoPagoPage.enterEmail(params.email);
  }

  /** @description Fills the password input on the MercadoPago login page. */
  async $tf_enterPassword(params: { password: string }) {
    await this.mercadoPagoPage.enterPassword(params.password);
  }

  /** @description Clicks the login/submit button on the MercadoPago login page. */
  async $tf_clickLoginButton() {
    await this.mercadoPagoPage.clickOnLoginButton();
  }

  /** @description Clicks the login with account button to enter the MercadoPago authenticated flow. */
  async $tf_clickLoginWithAccount() {
    await this.mercadoPagoPage.clickOnLoginWithAccount();
  }

  /** @description Clicks the account balance payment method option in MercadoPago. */
  async $tf_clickAccountBalance() {
    await this.mercadoPagoPage.clickOnAccountBalance();
  }

  /** @description Clicks the credit card payment method option in MercadoPago. */
  async $tf_clickCreditCard() {
    await this.mercadoPagoPage.clickOnCreditCard();
  }

  /** @description Clicks the debit card payment method option in MercadoPago. */
  async $tf_clickDebitCard() {
    await this.mercadoPagoPage.clickOnDebitCard();
  }

  /** @description Clicks the change payment method button in MercadoPago. */
  async $tf_clickChangePaymentMethod() {
    await this.mercadoPagoPage.clickOnChangePaymentMethod();
  }

  /** @description Clicks the choose another payment method button in MercadoPago. */
  async $tf_clickChooseAnotherPaymentMethod() {
    await this.mercadoPagoPage.clickOnChooseAnotherPaymentMethod();
  }

  /** @description Fills all card fields (number, holder, expiration, CVV) in the MercadoPago card form. */
  async $tf_fillCard(params: { cardDetails: MercadoPagoWalletCardDetails }) {
    await this.mercadoPagoPage.fillCard(params.cardDetails);
  }

  /** @description Clicks the continue button in the MercadoPago flow. */
  async $tf_clickContinueButton() {
    await this.mercadoPagoPage.clickOnContinueButton();
  }

  /** @description Clicks the pay button in the MercadoPago payment review screen. */
  async $tf_clickPay() {
    await this.mercadoPagoPage.clickOnPay();
  }

  /** @description Clicks the installments dropdown trigger in MercadoPago. */
  async $tf_clickInstallments() {
    await this.mercadoPagoPage.clickOnInstallments();
  }

  /** @description Clicks the 3 installments option in the MercadoPago installments dropdown. */
  async $tf_clickOption3Installments() {
    await this.mercadoPagoPage.clickOnOption3Installments();
  }

  /** @description Clicks the 1x installment option in the MercadoPago installments selector. */
  async $tf_clickOneInstallmentOption() {
    await this.mercadoPagoPage.clickOnOneInstallmentOption();
  }

  /** @description Clicks the bank transfer payment method option in MercadoPago. */
  async $tf_clickBankTransfer() {
    await this.mercadoPagoPage.clickOnBankTransfer();
  }

  /** @description Clicks the Buy Now Pay Later (BNPL) payment method option in MercadoPago, handling the choose-another-method button if visible. */
  async $tf_clickBNPL() {
    await this.mercadoPagoPage.clickOnBNPL();
  }

  /** @description Clicks the Efecty payment method option in MercadoPago. */
  async $tf_clickEfecty() {
    await this.mercadoPagoPage.clickOnEfecty();
  }

  /** @description Clicks the BBVA payment method option in MercadoPago. */
  async $tf_clickBBVA() {
    await this.mercadoPagoPage.clickOnBBVA();
  }

  /** @description Clicks the back-to-site button in MercadoPago. */
  async $tf_clickBackToSite() {
    await this.mercadoPagoPage.clickOnBackToSite();
  }

  /** @description Enters the verification code character by character into the MercadoPago code inputs. */
  async $tf_enterCode(params: { code: string }) {
    await this.mercadoPagoPage.enterCode(params.code);
  }

  /** @description Extracts the 6-digit verification code embedded before the @ in an email address. */
  async $tf_getVerificationCodeFromEmail(params: { email: string }) {
    return this.mercadoPagoPage.getVerificationCodeFromEmail(params.email);
  }

  /** @description Clicks the submit button in the MercadoPago verification code screen. */
  async $tf_clickSubmitButton() {
    await this.mercadoPagoPage.clickOnSubmitButton();
  }

  /** @description Clicks the acknowledge button on the MercadoPago payment result screen. */
  async $tf_clickButtonAcknowledge() {
    await this.mercadoPagoPage.clickOnButtonAcknowledge();
  }

  /** @description Returns whether the enter-code container is visible in MercadoPago within the given timeout. */
  async $tf_isContainerEnterCodeVisible(params?: { timeout?: number }) {
    return await this.mercadoPagoPage.isContainerEnterCodeVisible(params?.timeout);
  }

  /** @description Detects if MercadoPago is showing a CAPTCHA challenge, returning true if any CAPTCHA element is visible. */
  async $tf_hasCaptcha(params?: { timeout?: number }) {
    return await this.mercadoPagoPage.hasCaptcha(params?.timeout);
  }

  /** @description Handles the post-payment flow in MercadoPago, detecting CAPTCHA, MP internal errors, or successful payment rejection. */
  async $tf_handlePostPaymentFlow() {
    return await this.mercadoPagoPage.handlePostPaymentFlow();
  }

  /** @description Waits for the MercadoPago processing payment screen to disappear before continuing. */
  async $tf_waitForProcessingToComplete(params?: { timeout?: number }) {
    await this.mercadoPagoPage.waitForProcessingToComplete(params?.timeout);
  }

  /** @description Asserts that the MercadoPago wallet landing page with account/without-account buttons is visible. */
  async $tf_assertMercadoPagoWalletVisible() {
    await this.mercadoPagoPage.assertMercadoPagoWalletIsVisible();
  }

  /** @description Asserts that the how-to-pay title in the MercadoPago payment methods screen is visible. */
  async $tf_assertHowToPayViewVisible() {
    await this.mercadoPagoPage.assertHowToPayViewVisible();
  }

  /** @description Asserts that the payment method review labels are visible in MercadoPago. */
  async $tf_assertPaymentMethodViewVisible() {
    await this.mercadoPagoPage.assertPaymentMethodViewVisible();
  }

  /** @description Asserts that the card form is visible in MercadoPago by checking the card number input. */
  async $tf_assertLabelCardFormVisible() {
    await this.mercadoPagoPage.assertLabelCardFormVisible();
  }

  /** @description Asserts that the redirecting-to-site label is visible in MercadoPago. */
  async $tf_assertLabelRedirectingToSiteVisible() {
    await this.mercadoPagoPage.assertLabelRedirectingToSiteVisible();
  }

  /** @description Asserts that the processing payment label is visible in MercadoPago. */
  async $tf_assertLabelProcessingPaymentVisible() {
    await this.mercadoPagoPage.assertLabelProcessingPaymentVisible();
  }

  /** @description Asserts that the MercadoPago warning alert notification has the expected text. */
  async $tf_assertAlertNotification(params: { text: string }) {
    await this.mercadoPagoPage.assertAlertNotification(params.text);
  }

  /** @description Asserts that the payment successful label is visible on the MercadoPago thank-you page. */
  async $tf_assertPaymentSuccessful() {
    await this.mercadoPagoPage.assertPaymentSuccessful();
  }

  /** @description Asserts that the payment processing label is visible on the MercadoPago thank-you page. */
  async $tf_assertPaymentProcessing() {
    await this.mercadoPagoPage.assertPaymentProcessing();
  }

  /** @description Asserts that the payment failed/rejected icon is visible in MercadoPago, handling MP internal errors with evidence capture. */
  async $tf_assertPaymentFailed(params?: { testInfo?: any }) {
    await this.mercadoPagoPage.assertPaymentFailed(params?.testInfo);
  }

  /** @description Asserts payment rejection or captures evidence if MercadoPago shows an internal error page. */
  async $tf_assertPaymentFailedOrMPError(params?: { timeout?: number; testInfo?: any }) {
    await this.mercadoPagoPage.assertPaymentFailedOrMPError(params?.timeout, params?.testInfo);
  }

  /** @description Asserts that the finalize payment label is visible on the MercadoPago result page. */
  async $tf_assertPaymentFinalize() {
    await this.mercadoPagoPage.assertPaymentFinalize();
  }

  /** @description Asserts that the BBVA payment instruction is visible on the MercadoPago thank-you page. */
  async $tf_assertBBVAInstructionVisible() {
    await this.mercadoPagoPage.assertBBVAInstructionVisible();
  }
}
