import { EmailGenerator } from '@support/utils/EmailGenerator';
import { FrameLocator, Locator, Page, expect } from '@playwright/test';
import { BaseUserAddress } from '@support/interfaces/address_user';
import envConfig from '@support/envConfig';

export class ValidateEmailPage {
  readonly page: Page;
  readonly inputEmail: Locator;
  readonly buttonContinue: Locator;
  readonly buttonCloseWidgetForward: Locator;
  readonly labelEnterEmailToBeginProcess: Locator;
  readonly buttonConfirmCloseSession: Locator;
  readonly labelCompleteUserData: Locator;

  constructor(page: Page) {
    this.page = page;
    this.inputEmail = page.locator("input[id='login-pattern-email']");
    this.buttonContinue = page.getByTestId('footer-continue-btn');
    this.buttonCloseWidgetForward = page.getByRole('button', { name: 'logout' });
    this.labelEnterEmailToBeginProcess = page.locator(
      '//p[contains(text(),"Ingresa tu correo para comenzar el proceso de pago de tu orden")]'
    );
    this.buttonConfirmCloseSession = page.getByRole('button', { name: 'Confirmar' });
    this.labelCompleteUserData = page.locator('//p[contains(text(),"Completa tus datos")]');
  }

  async getSessionCredentials() {
    const cdlBaseUrl = envConfig.CDL_URL;
    await this.page.waitForTimeout(10000);
    const storageState = await this.page.context().storageState();
    const state = storageState.origins.find((e) => e.origin === cdlBaseUrl)?.localStorage;
    const sessionId = state.find((e) => e.name === 'sessionId')?.value;

    return { sessionId: sessionId, deviceId: '' };
  }

  async assertEmailInputIsVisible() {
    expect(this.labelEnterEmailToBeginProcess.isVisible());
    expect(this.inputEmail.isVisible());
  }

  async addAddressIfNecessary(userAddress?: BaseUserAddress) {
    console.log('[INFO] Adding address if necessary');
    if (await this.labelCompleteUserData.isVisible()) {
      console.log('[INFO] Completing user data');
      // TODO change this implementation
      await this.page.locator('label:has-text("Dirección")').click();
      await this.page.getByPlaceholder('Ej').last().fill(userAddress.address);
      await this.page.waitForTimeout(1000);
      await this.page.locator(`p:has-text("${userAddress.address}")`).first().click();
      await this.page.getByRole('button', { name: 'Confirmar' }).click();
      await this.page.waitForTimeout(1000);
      await this.buttonContinue.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async ifUserLogged(userAddress?: BaseUserAddress) {
    if (await this.inputEmail.isVisible({ timeout: 5000 })) {
      console.log('[INFO] User not logged. Continue... ');
    } else {
      console.log('[INFO] User is logged.... Closing widget and reseting session now! ');
      await this.addAddressIfNecessary(userAddress);
    }
  }

  async enterEmail(email: string, userAddress?: BaseUserAddress) {
    const responseGetUsers = this.page.waitForResponse(
      (response) => response.url().includes('/v2/users') && response.request().method() === 'GET'
    );
    await this.page.waitForTimeout(1000);
    await this.fillEmail(email, userAddress);
    await responseGetUsers;
  }

  async fillEmail(email: string, userAddress?: BaseUserAddress) {
    await this.ifUserLogged(userAddress);
    await this.inputEmail.fill(email);
  }

  async clickOnContinue() {
    await expect(this.buttonContinue).toBeVisible();
    await this.buttonContinue.click();
    await this.skipVerificationCodeIfPresent();
  }

  /**
   * Random emails (e.g. {random}.qa@deuna.com) can collide with existing users,
   * triggering a verification code screen instead of proceeding as guest.
   * If this screen appears, click "Continuar sin ingresar el código" to skip it.
   */
  private async skipVerificationCodeIfPresent() {
    const continueAsGuestButton = this.page.locator('[data-testid="continue-as-guest-button"]');
    const isVisible = await continueAsGuestButton.isVisible({ timeout: 5_000 }).catch(() => false);

    if (isVisible) {
      await continueAsGuestButton.click();
    }
  }

  async enterFakeEmailAndContinue() {
    await this.enterEmail(EmailGenerator.generatePayerEmail());
    await this.clickOnContinue();
  }

  async emailNewUserAndContinue(email: string, userAddress?: BaseUserAddress) {
    await this.enterEmail(email, userAddress);
    await this.clickOnContinue();
  }
}
