import { expect, Locator, Page } from '@playwright/test';
import { CommonsActions } from '@pages/commonActions';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { AplazoTranslations } from '@support/translations/selectors/explore/aplazo/aplazoTranslations';

export class AplazoRedirectPage extends CommonsActions {
  readonly page: Page;

  readonly inputPhone: Locator;
  readonly buttonContinue: Locator;
  readonly buttonVerifyOTP: Locator;

  readonly buttonBackStore: Locator;
  readonly buttonBuy: Locator;

  readonly rejectedTitle: Locator;
  readonly invalidOTP: Locator;
  readonly labelProcessingOrder: Locator;
  readonly selectors: AplazoTranslations;

  // Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;

    this.selectors = getTranslations('explore/aplazo', languageCode);
    this.inputPhone = page.locator('#login-credentials-phone-input');
    this.buttonContinue = page.getByRole('button', {
      name: this.selectors.screenAplazoPayModal.buttons.continueButton,
    });
    this.buttonVerifyOTP = page.getByText(/Verificar/i);

    this.buttonBackStore = page.locator('#store-back-icon');
    this.buttonBuy = page.getByRole('button', {
      name: this.selectors.screenAplazoPayModal.buttons.confirmPurchase,
    });

    this.rejectedTitle = this.page.getByTitle(
      this.selectors.screenAplazoPayModal.errors.purchaseRejectedTitle
    );
    this.labelProcessingOrder = page.getByText(
      this.selectors.screenRedirectToCommerceView.labelProcessingOrder
    );
  }

  async sendPhonenumber(phoneNumber: string = '5519526966') {
    await this.inputPhone.fill(phoneNumber);
    await this.buttonContinue.click({ force: true });
  }

  async verifyOTP(otp = '123456') {
    const inputs = otp.split('');
    for (let i = 0; i < inputs.length; i++) {
      await this.page.locator(`#mat-input-${i}`).fill(inputs[i]);
    }
  }

  async verifyOTPForAplazo(otp = '123456') {
    const inputs = otp.split('');
    for (let i = 0; i < inputs.length; i++) {
      await this.page.locator(`#verify-phone--otp-code-input-${i}`).fill(inputs[i]);
    }
  }

  async clickOnStoreBackButton() {
    await this.buttonBackStore.click();
  }

  async clickOnButtonBuy() {
    await this.buttonBuy.click({ timeout: 60000, force: true });
  }

  async clickOnButtonContinue() {
    await this.buttonContinue.click({ timeout: 60000, force: true });
  }

  async assertRejectedPage() {
    await expect(this.rejectedTitle).toBeVisible();
  }

  async assertProcessingOrder() {
    await expect(this.labelProcessingOrder).toBeVisible({ timeout: 30000 });
  }

  async closePage() {
    await this.page.close();
  }
}
