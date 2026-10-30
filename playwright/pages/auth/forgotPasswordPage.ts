import { Page, Locator, expect } from '@playwright/test';
import envConfig from '@support/envConfig';

export class ForgotPasswordPage {
  readonly page: Page;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.errorMessage = page.locator('text=Ocurrió un error');
  }

  async navigateToForgotPassword(merchantId: string, merchantCode: string, redirectUrl: string) {
    const url = `${envConfig.BASE_URL_POSTMAN}/users/web/forgot-password?merchant_id=${merchantId}&merchant_code=${merchantCode}&redirect_url=${encodeURIComponent(redirectUrl)}`;
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) => res.url().includes('forgot-password') && res.status() === 200
      ),
      this.page.goto(url),
    ]);

    expect(response.status()).toBe(200);
  }

  async validateErrorMessageIsVisible() {
    await expect(this.errorMessage).toBeVisible();
  }
}
