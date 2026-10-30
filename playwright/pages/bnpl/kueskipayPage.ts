import { expect, Locator, Page } from '@playwright/test';
import { CommonsActions } from '@pages/commonActions';
import { KueskiTranslations } from '@support/translations/selectors/explore/kueski/kueskiTranslations';
import { getTranslations } from '@support/translations/getTranslations';

export class KueskipayPage extends CommonsActions {
  readonly page: Page;
  readonly selectors: KueskiTranslations;

  readonly inputUsername: Locator;
  readonly inputPassword: Locator;
  readonly buttonLogin: Locator;

  readonly buttonBackStore: Locator;
  readonly buttonBuy: Locator;

  readonly rejectedTitle: Locator;

  // Locators
  constructor(page: Page) {
    super(page);
    this.page = page;
    this.selectors = getTranslations('explore/kueski', 'ES');

    this.inputUsername = page.locator('#username');
    this.inputPassword = page.locator('#password');
    this.buttonLogin = page.locator('#buttonContinueId');

    this.buttonBackStore = page.locator('#store-back-icon');
    this.buttonBuy = page.getByRole('button', { name: 'Comprar' });

    this.rejectedTitle = this.page.getByTitle(
      this.selectors.screenKueski.errors.purchaseRejectedTitle
    );
  }

  async completeLoginAction() {
    const username = 'deuna_user_01_1725665531@kueski.com';
    const password = 'Test1234';

    await this.inputUsername.fill(username);
    await this.inputPassword.fill(password);
    await this.buttonLogin.click();
  }

  async clickOnStoreBackButton() {
    await this.buttonBackStore.click();
  }

  async clickOnButtonBuy() {
    await this.buttonBuy.click({ timeout: 180000 });
  }

  async assertRejectedPage() {
    await expect(this.rejectedTitle).toBeVisible();
  }

  async closePage() {
    await this.page.close();
  }
}
