import { Context, FrameworkPlugin } from '../interface';
import { ClickToPayFormPage } from '@pages/explore/forms/clickToPayFormPage';
import { ClickToPayPage } from '@pages/clickToPay/clickToPayPage';
import { BaseCreditCard } from '@support/interfaces/credit_cards/baseCreditCard';
import { Response } from '@playwright/test';

export class PluginCheckoutWalletClick2Pay extends FrameworkPlugin {
  pluginBaseName = 'checkout.wallet.click2pay';

  click2PayFormPage!: ClickToPayFormPage;
  click2PayPage!: ClickToPayPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.click2PayFormPage = new ClickToPayFormPage(context.page);
    this.click2PayPage = new ClickToPayPage(context.page);
  }

  /** @description Fills all card fields (number, expiration date, CVV, cardholder name) in the Click2Pay form. */
  async $tf_fillCardInfo(params: { creditCardInfo: BaseCreditCard }) {
    await this.click2PayFormPage.fillCardInfo(params.creditCardInfo);
  }

  /** @description Fills the credit card number input in the Click2Pay iframe. */
  async $tf_fillCreditCardNumber(params: { creditCardNumber: string }) {
    await this.click2PayFormPage.fillInputCreditCardNumber(params.creditCardNumber);
  }

  /** @description Fills the expiration date input in the Click2Pay iframe. */
  async $tf_fillExpirationDate(params: { expirationDate: string }) {
    await this.click2PayFormPage.fillInputExpirationDate(params.expirationDate);
  }

  /** @description Fills the CVV input in the Click2Pay iframe. */
  async $tf_fillCvv(params: { cvv: string }) {
    await this.click2PayFormPage.fillCvv(params.cvv);
  }

  /** @description Fills the cardholder name input in the Click2Pay iframe. */
  async $tf_fillCardHolder(params: { cardHolder: string }) {
    await this.click2PayFormPage.fillInputCardHolder(params.cardHolder);
  }

  /** @description Clears the cardholder name input in the Click2Pay iframe. */
  async $tf_clearCardHolder() {
    await this.click2PayPage.clearInputCardHolder();
  }

  /** @description Fills the OTP verification code in the Click2Pay authentication window. */
  async $tf_fillOtp(params: { otp: string }) {
    await this.click2PayFormPage.fillOtp(params.otp);
  }

  /** @description Clicks the send OTP button for the specified channel (email or sms) in the Click2Pay authentication flow. */
  async $tf_clickSendOtp(params: { otpType: 'email' | 'sms' }) {
    await this.click2PayFormPage.clickOnSendOtp(params.otpType);
  }

  /** @description Clicks the continue button to proceed to the Click2Pay authentication flow. */
  async $tf_clickContinueToAuthFlow() {
    await this.click2PayFormPage.clickOnContinueToAuthFlow();
  }

  /** @description Clicks the continue button to proceed into the Click2Pay payment flow. */
  async $tf_clickContinueToClick2PayFlow() {
    await this.click2PayFormPage.clickOnContinueToClickToPayFlow();
  }

  /** @description Clicks the main continue button in the Click2Pay form. */
  async $tf_clickContinue() {
    await this.click2PayFormPage.clickOnContinue();
  }

  /** @description Clicks the continue-as-guest button in the Mastercard user info iframe. */
  async $tf_clickContinueAsGuest() {
    await this.click2PayFormPage.clickInContinueAsGuest();
  }

  /** @description Clicks the enter-as-guest radio button in the Mastercard user info iframe. */
  async $tf_clickEnterAsGuest() {
    await this.click2PayFormPage.clickInEnterAsGuest();
  }

  /** @description Clicks continue and confirms the guest flow in the Mastercard user info iframe. */
  async $tf_clickContinueAndConfirmsGuestFlow() {
    await this.click2PayFormPage.clickInContinueAndConfirmsGuestFlow();
  }

  /** @description Fills user info in the Mastercard iframe, handling the guest flow automatically if it appears. */
  async $tf_fillUserInfo() {
    await this.click2PayFormPage.fillUserInfo();
  }

  /** @description Fills the Mastercard user info (phone number) in the Mastercard UCS iframe. */
  async $tf_fillMastercardUserInfo() {
    await this.click2PayFormPage.fillMastercardUserInfo();
  }

  /** @description Saves the Mastercard user info by clicking the continue button. */
  async $tf_saveMastercardUserInfo() {
    await this.click2PayFormPage.saveMastercardUserInfo();
  }

  /** @description Fills the email input in the Click2Pay collect email screen. */
  async $tf_fillEmail(params: { email: string }) {
    await this.click2PayFormPage.fillEmail(params.email);
  }

  /** @description Clicks the back/exit button in the Click2Pay form to go back. */
  async $tf_clickBack() {
    await this.click2PayFormPage.clickOnBack();
  }

  /** @description Clicks the back button inside the Click2Pay iframe. */
  async $tf_clickBackButton() {
    await this.click2PayFormPage.clickOnBackButton();
  }

  /** @description Accepts the cookie policy modal if present, applicable for country BR. */
  async $tf_acceptCookiePolicyIfPresent(params: { country: string }) {
    await this.click2PayFormPage.acceptCookiePolicyIfPresent(params.country);
  }

  /** @description Clicks the accept terms and conditions checkbox in the Click2Pay form. */
  async $tf_clickAcceptTermsAndConditions() {
    await this.click2PayFormPage.clickOnAcceptTermsAndConditions();
  }

  /** @description Waits for the POST /cards response from the DEUNA API, used to verify card saving. */
  async $tf_waitResponseFromSaveCard() {
    return await this.click2PayFormPage.waitResponseFromSaveCard();
  }

  /** @description Sets up an interceptor to wait for the purchase response from the Click2Pay transaction. */
  async $tf_waitForPurchaseResponse() {
    await this.click2PayFormPage.waitForPurchaseResponse();
  }

  /** @description Waits for the identities validation request to be fired during the Click2Pay flow. */
  async $tf_waitForValidationRequest() {
    await this.click2PayFormPage.waitForValidationRequest();
  }

  /** @description Waits for the Mastercard Sonic SDK script to be requested, returning true if called within the timeout. */
  async $tf_WaitForSonicSdkCalled() {
    return await this.click2PayFormPage.WaitForSonicSdkCalled();
  }

  /** @description Asserts that the Click2Pay OTP authentication form container is visible. */
  async $tf_assertClickToPayAuthFormVisible() {
    await this.click2PayFormPage.assertClickToPayAuthFormIsVisible();
  }

  /** @description Asserts that the available cards list (Visa/Mastercard/Amex) container is visible in the Click2Pay iframe. */
  async $tf_assertAvailableCards() {
    await this.click2PayFormPage.assertAvailableCards();
  }

  /** @description Asserts that the CVV required error message is visible in the Click2Pay flow. */
  async $tf_assertCvvRequiredMessage() {
    await this.click2PayFormPage.assertCvvRequiredMessage();
  }

  /** @description Asserts that the cardholder validation error message is visible on the card form. */
  async $tf_assertCardHolderError() {
    await this.click2PayPage.assertCardHolderError();
  }

  /** @description Asserts all card form validation error messages are visible (card number, expiration date, CVV, cardholder). */
  async $tf_assertCardFormErrorMessages() {
    await this.click2PayPage.assertCardFormErrorMessages();
  }

  /** @description Asserts that the collect email screen headings (account access, email label, disclaimer) are visible. */
  async $tf_assertCollectEmailHeadings() {
    await this.click2PayFormPage.assertCollectEmailHeadings();
  }

  /** @description Asserts that the user data section headings (title, first name, last name) are visible. */
  async $tf_assertUserDataHeadings() {
    await this.click2PayFormPage.assertUserDataHeadings();
  }

  /** @description Asserts that the payment section headings (title, card fields) are visible. */
  async $tf_assertPaymentsHeadings() {
    await this.click2PayFormPage.assertPaymentsHeadings();
  }

  /** @description Asserts that the billing section title is visible in the Click2Pay form. */
  async $tf_assertBillingHeadings() {
    await this.click2PayFormPage.assertBillingHeadings();
  }

  /** @description Asserts that the Click2Pay agreement/disclaimer section is visible. */
  async $tf_assertClickToPayAgreementSection() {
    await this.click2PayFormPage.assertClickToPayAgreementSection();
  }

  /** @description Asserts that the OTP user page title is visible in the Click2Pay flow. */
  async $tf_assertUserOtpTitle() {
    await this.click2PayFormPage.assertUserOtpTitle();
  }

  /** @description Asserts that the Mastercard UCS iframe displays the correct locale/country text. */
  async $tf_assertMastercardHasProperLocaleText(params: { locale: string }) {
    await this.click2PayFormPage.assertMastercardHasProperLocaleText(params.locale);
  }

  /** @description Asserts that the processing your order page is visible during the Click2Pay flow. */
  async $tf_assertProcessingPage() {
    await this.click2PayFormPage.assertProcessingPage();
  }

  /** @description Asserts that the Mastercard Sonic SDK is called, confirming the Sonic brand experience is shown. */
  async $tf_assertUserSeesMastercardSonicBrand() {
    await this.click2PayFormPage.assertUserSeesMastercardSonicBrand();
  }

  /** @description Asserts that the user billing and shipping address data (name, last name) is correctly sent in the purchase request. */
  async $tf_assertUserDataSentInPurchaseRequest(params: { name: string; last_name: string }) {
    await this.click2PayFormPage.assertUserDataIsSendInPurchaseRequest(params);
  }

  /** @description Asserts the payload sent when creating a card in Click2Pay contains all required credential_source_config fields. */
  async $tf_assertCreateCardPayload(params: { response: Response }) {
    await this.click2PayFormPage.assertCreateCardPayload(params.response);
  }

  /** @description Asserts the response from creating a card in Click2Pay has status 201 and contains all required card data fields. */
  async $tf_assertCreateCardResponse(params: { response: Response }) {
    await this.click2PayFormPage.assertCreateCardResponse(params.response);
  }

  /** @description Asserts that the missing email error message is visible after attempting to continue without an email. */
  async $tf_showErrorMessageForMissingEmail() {
    await this.click2PayFormPage.showErrorMessageForMissingEmail();
  }

  /** @description Asserts that the missing terms and conditions alert is visible after attempting to continue without accepting. */
  async $tf_showAlertForMissingTermsAndConditions() {
    await this.click2PayFormPage.showAlertForMissingTermsAndConditions();
  }

  /** @description Clicks the terms and conditions link and verifies it opens a page containing the expected URL. */
  async $tf_opensTermsConditionsPage(params: { urlLink: string }) {
    await this.click2PayFormPage.opensTermsConditionsPage(params.urlLink);
  }

  /** @description Returns whether the Click2Pay payment container widget is visible. */
  async $tf_widgetIsVisible() {
    return await this.click2PayFormPage.widgetIsVisible();
  }

  /** @description Returns whether the Click2Pay payment container widget is hidden. */
  async $tf_widgetIsNotVisible() {
    return await this.click2PayFormPage.widgetIsNotVisible();
  }
}
