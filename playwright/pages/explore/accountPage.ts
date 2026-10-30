import { Locator, Page, expect } from '@playwright/test';
import { CommonsActions } from '@pages/commonActions';

export type PaymentVaultIntegrationType = 'embedded' | 'modal';

export class AccountPage extends CommonsActions {
  readonly page: Page;
  readonly buttonLogin: Locator;
  readonly inputLoginEmail: Locator;
  readonly buttonLoginContinue: Locator;
  readonly pinCodeContainer: Locator;
  readonly welcomeUserContainer: Locator;
  readonly buttonPaymentMethods: Locator;
  readonly cardsListContainer: Locator;
  readonly buttonIntegrationEmbedded: Locator;
  readonly buttonIntegrationModal: Locator;

  //Locators
  constructor(page: Page) {
    super(page);
    this.page = page;
    this.buttonLogin = page.locator('#login-button');
    this.inputLoginEmail = page.locator('#login-email-input');
    this.buttonLoginContinue = page.locator('#login-continue-button');
    this.pinCodeContainer = page.locator('[data-baseweb="pin-code"]');
    this.welcomeUserContainer = page.getByTestId('welcome-user-container').first();
    this.buttonPaymentMethods = page.locator('#payment-methods');
    this.cardsListContainer = page.locator('#cards-list-container');
    this.buttonIntegrationEmbedded = page.getByTestId('integration-button-embedded');
    this.buttonIntegrationModal = page.getByTestId('integration-button-modal');
  }

  //Actions
  async clickLoginButton() {
    await this.ensureVisibleToClick(this.buttonLogin);
  }

  async fillLoginEmail(email: string) {
    await this.inputLoginEmail.fill(email);
  }

  async clickLoginContinue() {
    await this.ensureVisibleToClick(this.buttonLoginContinue);
  }

  async enterOtpCode(code: string = '010101') {
    const digitInputs = this.pinCodeContainer.locator('input');
    const digits = code.split('');

    for (let i = 0; i < digits.length; i++) {
      await digitInputs.nth(i).fill(digits[i]);
    }
  }

  async login(email: string, otpCode: string = '010101') {
    await this.clickLoginButton();
    await this.fillLoginEmail(email);
    await this.clickLoginContinue();
    await this.enterOtpCode(otpCode);
  }

  async clickPaymentMethodsButton() {
    await this.ensureVisibleToClick(this.buttonPaymentMethods);
  }

  async openPaymentVault(integrationType: PaymentVaultIntegrationType = 'embedded') {
    const button =
      integrationType === 'modal' ? this.buttonIntegrationModal : this.buttonIntegrationEmbedded;
    await this.ensureVisibleToClick(button);
  }

  async clickInUserProfile() {
    await this.ensureVisibleToClick(this.welcomeUserContainer);
    await this.welcomeUserContainer.click();
  }

  //Assertions
  async assertWelcomeUserIsVisible(username: string) {
    await expect(this.welcomeUserContainer).toBeVisible();
    await expect(this.welcomeUserContainer).toContainText(new RegExp(`Hola ${username}`, 'i'));
  }

  async assertCardsListContainerIsVisible() {
    await expect(this.cardsListContainer).toBeVisible();
  }

  async assertCardIsVisibleInList(lastFourDigits: string) {
    const cardEntry = this.cardsListContainer
      .locator('[data-baseweb="typo-paragraphmedium"]')
      .filter({ hasText: lastFourDigits });
    await expect(cardEntry).toBeVisible();
  }
}
