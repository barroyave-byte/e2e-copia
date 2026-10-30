import { FrameLocator, Locator, Page, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly inputCodeOtp: Locator;
  readonly buttonContinueWithoutEnterCode: Locator;
  readonly labelEnterEmailToBeginProcess: Locator;
  readonly buttonCloseWidgetForward: Locator;
  readonly buttonCloseSessionForward: Locator;
  readonly labelEnterCodeSent: Locator;
  readonly buttonSendOtpByEmail: Locator;
  readonly buttonSendOtpBySMS: Locator;
  readonly changeChannelButton: Locator;
  readonly iconLock: Locator;
  readonly textTimerCounter: Locator;
  responseLogin: any;
  responseRequestCode: any;

  constructor(page: Page) {
    this.page = page;
    this.inputCodeOtp = page.locator('#otp-input-0');
    this.buttonContinueWithoutEnterCode = page.locator('[data-testid="continue-as-guest-button"]');
    this.labelEnterEmailToBeginProcess = page.locator(
      '//p[contains(text(),"Ingresa tu correo para comenzar el proceso de pago de tu orden")]'
    );
    this.buttonCloseWidgetForward = page.getByRole('button', { name: 'close' });
    this.buttonCloseSessionForward = page.locator('button:has-text("Cerrar sesión")');
    this.labelEnterCodeSent = page.locator(
      '//p[contains(text(),"Ingresa el código enviado a tu teléfono")]'
    );

    this.changeChannelButton = page.locator('[data-testid="change-otp-channel-button"]');
    this.iconLock = page.locator('img[alt="lock icon"]');
    this.textTimerCounter = page.getByTestId('timer_counter');
  }

  async enterOtpCode(codeOTP: string = '010101') {
    await this.inputCodeOtp.fill(codeOTP);
  }

  async enterWrongOtpCode(codeOTP: string = '222222') {
    await this.inputCodeOtp.fill(codeOTP);
  }

  async getlabelEnterEmailToBeginProcess() {
    const getTextLabel = await this.labelEnterEmailToBeginProcess.textContent();
    console.log(getTextLabel);
    return getTextLabel;
  }

  async clickOnContinueWithoutEnterCode() {
    await expect(this.buttonContinueWithoutEnterCode).toBeVisible({ timeout: 15000 });
    await this.buttonContinueWithoutEnterCode.focus();
    await this.buttonContinueWithoutEnterCode.click({ timeout: 15000 });
  }

  async clickOnChangeChannelButton() {
    await this.changeChannelButton.click();
  }

  // Asserts
  async assertPresenceViewOTP(type: string = 'email-passwordless') {
    this.responseRequestCode = this.page.waitForResponse(`**/users/request-code?type=${type}`);
    expect(await this.labelEnterCodeSent.isVisible());
  }

  async assertPresenceInputOTP() {
    await expect(this.inputCodeOtp).toBeVisible({ timeout: 10000 });
  }
  async assertLockIconToBeVisible() {
    await expect(await this.iconLock).toBeVisible({ timeout: 5000 });
  }

  async assertOtpTitleTextIsVisible(title: string) {
    await expect(this.page.getByText(title)).toBeVisible();
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

  async waitForLoginFinish() {
    this.responseLogin = this.page.waitForResponse('**/users/login?type=sms-passwordless');
    if (this.responseLogin) {
      const responseLogin = await this.responseLogin;
      expect(responseLogin.status(), 'login status').toBe(200);
    }
  }
}
