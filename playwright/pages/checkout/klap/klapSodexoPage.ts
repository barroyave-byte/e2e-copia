import { CommonsActions } from '@pages/commonActions';
import { expect, Locator, Page } from '@playwright/test';

export class KlapSodexoPage extends CommonsActions {
  readonly page: Page;
  readonly selectCardType: Locator;
  readonly inputDynamicKey: Locator;
  readonly buttonPay: Locator;
  readonly buttonRedirectToCommerce: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;

    this.selectCardType = page.locator('#inputCardType');
    this.inputDynamicKey = page.locator('#inputDynamicKey');
    this.buttonPay = page.locator('button.btn-submit');
    this.buttonRedirectToCommerce = page.locator('#btn-redirect');
  }

  async selectCardTypeOption(value: string = '2') {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.selectCardType, 'The card type selector is not visible').toBeVisible({
      timeout: 40000,
    });
    await this.selectCardType.selectOption(value);
  }

  async fillInputPassword(password: string = '1234') {
    await expect(this.inputDynamicKey, 'The dynamic key input is not visible').toBeVisible({
      timeout: 40000,
    });
    await this.inputDynamicKey.click();
    await this.inputDynamicKey.clear();
    await this.inputDynamicKey.fill(password);
    await expect(this.inputDynamicKey).toHaveValue(password);
    await this.inputDynamicKey.dispatchEvent('input');
    await this.inputDynamicKey.dispatchEvent('change');
    await this.inputDynamicKey.dispatchEvent('blur');
    await this.page.locator('body').click({ position: { x: 0, y: 0 } });
  }

  async clickOnPay() {
    await expect(this.buttonPay).toBeEnabled({ timeout: 15000 });
    await this.ensureVisibleToClick(this.buttonPay);
  }

  async clickOnRedirectToCommerce() {
    try {
      const button = this.buttonRedirectToCommerce;
      if (await button.isVisible()) {
        await button.click();
      }
    } catch (error) {
      expect(this.page.isClosed()).toBe(true);
    }
  }

  async assertButtonPayAvailable() {
    await expect(this.buttonPay).toBeEnabled({ timeout: 5000 });
  }
}
