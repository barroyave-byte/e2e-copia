import { FrameLocator, Locator, Page, expect } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';

export class LoginPage {
  readonly page: Page;
  readonly selectors: CheckoutTranslations;
  readonly iframeZoidVisible: FrameLocator;
  readonly inputCodeOtp: Locator;
  readonly buttonContinueWithoutEnterCode: Locator;
  readonly labelEnterEmailToBeginProcess: Locator;
  readonly buttonCloseWidgetForward: Locator;
  readonly buttonCloseSessionForward: Locator;
  readonly labelEnterCodeSent: Locator;
  readonly buttonSendOtpByEmail: Locator;
  readonly buttonSendOtpBySMS: Locator;
  readonly changeChannelButton: Locator;

  responsePromise: any;
  responseRequestCode: any;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    this.page = page;
    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');
    this.selectors = getTranslations('checkout', languageCode);
    // Localizadores asociados al iframe
    this.inputCodeOtp = this.iframeZoidVisible.locator('#otp-input-0');
    this.buttonContinueWithoutEnterCode = this.iframeZoidVisible.locator(
      '[data-testid="continue-as-guest-button"]'
    );
    this.labelEnterEmailToBeginProcess = this.iframeZoidVisible.locator(
      '//p[contains(text(),"Ingresa tu correo para comenzar el proceso de pago de tu orden")]'
    );
    this.buttonCloseWidgetForward = this.iframeZoidVisible.getByRole('button', { name: 'close' });
    this.buttonCloseSessionForward = this.iframeZoidVisible.getByRole('button', { name: 'logout' });
    this.labelEnterCodeSent = this.iframeZoidVisible.getByText(
      this.selectors.loginFormSelectors.enterCodeSent
    );
    this.changeChannelButton = this.iframeZoidVisible.locator(
      '[data-testid="change-otp-channel-button"]'
    );
  }

  // Métodos ajustados

  async enterOtpCode(codeOTP: string = '010101') {
    await this.inputCodeOtp.fill(codeOTP, {timeout: 50000});
  }

  async enterWrongOtpCode(codeOTP: string = '222222') {
    await this.inputCodeOtp.fill(codeOTP, {timeout: 50000});
  }

  async getlabelEnterEmailToBeginProcess() {
    const getTextLabel = await this.labelEnterEmailToBeginProcess.textContent();
    console.log(getTextLabel);
    return getTextLabel;
  }

  async clickOnContinueWithoutEnterCode() {
    await this.page.waitForTimeout(2000);
    await this.buttonContinueWithoutEnterCode.click({ timeout: 10000 });
  }

  async clickOnChangeChannelButton() {
    await this.changeChannelButton.click();
  }

  async assertOtpBodyHasLanguageCode() {
    const response = await this.responseRequestCode;
    const requestBody = response.request().postDataJSON();
    expect(requestBody, "The request 'request code' doesn't contain lang and pt").toHaveProperty(
      'lang',
      'pt'
    );
    expect(requestBody).toHaveProperty('email');
  }

  async assertLabelEnter() {
    const verifyLabel = await this.getlabelEnterEmailToBeginProcess();
    expect(verifyLabel).toBe('Ingresa tu correo para comenzar el proceso de pago de tu orden');
  }

  async assertCloseSessionIsVisible() {
    await expect(this.buttonCloseSessionForward).toBeVisible();
  }
}
