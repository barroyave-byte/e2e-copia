import { EmailGenerator } from '@support/utils/EmailGenerator';
import { FrameLocator, Locator, Page, expect } from '@playwright/test';
import { BaseUserAddress } from '@support/interfaces/address_user';
import envConfig from '@support/envConfig';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@support/translations/getTranslations';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';

export class ValidateEmailPage {
  readonly page: Page;
  readonly iframeZoidVisible: FrameLocator;
  readonly inputEmail: Locator;
  readonly buttonCloseWidgetForward: Locator;
  readonly labelEnterEmailToBeginProcess: Locator;
  readonly buttonConfirmCloseSession: Locator;
  readonly labelCompleteUserData: Locator;
  readonly selectors: CheckoutTranslations;
  readonly pciLogo: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    this.page = page;
    this.selectors = getTranslations('checkout', languageCode);
    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');

    // Localizadores asociados al iframe
    this.inputEmail = this.iframeZoidVisible.locator("input[id='login-pattern-email']");
    this.buttonCloseWidgetForward = this.iframeZoidVisible.getByRole('button', { name: 'logout' });
    this.labelEnterEmailToBeginProcess = this.iframeZoidVisible.locator(
      '//p[contains(text(),"Ingresa tu correo para comenzar el proceso de pago de tu orden")]'
    );
    this.buttonConfirmCloseSession = this.iframeZoidVisible.getByRole('button', {
      name: 'Confirmar',
    });
    this.labelCompleteUserData = this.iframeZoidVisible.getByText('Completa tus datos');
    this.pciLogo = this.iframeZoidVisible.locator('img[alt="pci logo"]');
  }

  async getSessionCredentials() {
    const cdlBaseUrl = envConfig.CDL_URL;
    await this.page.waitForTimeout(10000);
    const storageState = await this.page.context().storageState();
    const state = storageState.origins.find((e) => e.origin === cdlBaseUrl)?.localStorage;
    const sessionId = state?.find((e) => e.name === 'sessionId')?.value;

    return { sessionId: sessionId, deviceId: '' };
  }

  async closeWidget() {
    console.log('[INFO] Closing widget to reset session');
    await this.buttonCloseWidgetForward.click();
    await this.buttonConfirmCloseSession.click();
  }

  async addAddressIfNecessary(userAddress?: BaseUserAddress) {
    console.log('userAddress: ', userAddress);
    console.log('[INFO] Adding address if necessary');
    if (await this.labelCompleteUserData.isVisible()) {
      console.log('[INFO] Completing user data');
      // TODO change this implementation
      await this.iframeZoidVisible.locator('label:has-text("Dirección")').click();
      await this.iframeZoidVisible
        .getByPlaceholder('Ej')
        .last()
        .fill(userAddress?.address ?? '');
      await this.page.waitForTimeout(1000);
      await this.iframeZoidVisible
        .locator(`h2:has-text("${userAddress?.address ?? ''}")`)
        .first()
        .click();

      const buttonConfirm = this.iframeZoidVisible.getByRole('button', { name: 'Confirmar' });
      await buttonConfirm.click({ timeout: 3000 });

      await this.page.waitForTimeout(5000);
      await this.iframeZoidVisible
        .getByRole('button', { name: 'Confirmar' })
        .click({ timeout: 3000 });
      await this.page.waitForTimeout(1000);
    }
  }

  async ifUserLogged(userAddress?: BaseUserAddress) {
    if (await this.inputEmail.isVisible({ timeout: 5000 })) {
      console.log('[INFO] User not logged. Continue...');
    } else {
      console.log('[INFO] User is logged.... Closing widget and resetting session now!');
      await this.addAddressIfNecessary(userAddress);
      await this.closeWidget();
    }
  }

  async enterEmail(email: string, userAddress?: BaseUserAddress) {
    const response = this.page.waitForResponse('**/addresses');
    await response;
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
    const continueButton = this.iframeZoidVisible.getByRole('button', {
      name: this.selectors.loginFormSelectors.labelButtonContinue,
    });
    await expect(continueButton).toBeVisible();
    await continueButton.click();
  }

  async enterFakeEmailAndContinue() {
    await this.enterEmail(EmailGenerator.generatePayerEmail());
    await this.clickOnContinue();
  }

  async emailNewUserAndContinue(email: string, userAddress?: BaseUserAddress) {
    await this.enterEmail(email, userAddress);
    await this.clickOnContinue();
  }

  async assertInputEmailIsVisible() {
    await expect(this.inputEmail).toBeVisible();
  }
}
