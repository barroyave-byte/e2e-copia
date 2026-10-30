import { expect, Locator, Page, Response } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { FormHelpers } from './formHelpers';

const PURCHASE_ENDPOINT = '/transactions/purchase';

export class BizumPushFormPage extends FormHelpers {
  readonly page: Page;
  readonly optionFormBizumPush: Locator;
  readonly buttonEmbedDesktop: Locator;
  readonly inputPhoneNumber: Locator;
  readonly buttonPay: Locator;
  responsePromise: Promise<Response>;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);

    this.page = page;
    this.optionFormBizumPush = page.locator('#payment_method_bizum_push');
    this.buttonEmbedDesktop = page.getByTestId('pay-button-desktop');
    this.inputPhoneNumber = page
      .locator('input[id*="phone-selector"]')
      .or(page.locator('[aria-label="Please enter a phone number without the country dial code."]'))
      .or(page.locator('[name="phone"]'))
      .or(page.locator('[data-testid="bizum-push-phone-value-input"]')); // migration-or
    this.buttonPay = page.locator('#payment-button');
  }

  async selectBizumTab() {
    await this.ensureVisibleToClick(this.optionFormBizumPush);
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.ensureVisibleToClick(this.buttonEmbedDesktop);
  }

  async waitUntilLoadPage() {
    await expect(this.iframeLocator(this.inputPhoneNumber)).toBeVisible({ timeout: 15000 });
  }

  async fillPhoneNumber(phone: string = '700000000') {
    await this.fillAndVerifyValue(this.iframeLocator(this.inputPhoneNumber), phone, {
      withoutSpaces: true,
    });
  }

  async clickPay() {
    await this.ensureVisibleToClick(this.iframeLocator(this.buttonPay));
  }

  async clickPayAndCapturePurchaseResponse() {
    this.responsePromise = this.page.waitForResponse(
      (r) => r.url().includes(PURCHASE_ENDPOINT) && r.request().method() === 'POST'
    );
    await this.clickPay();
  }

  async assertPurchaseErrorResponse(expectedErrorCode: string) {
    const response = await this.responsePromise;
    const body = await response.json();
    expect(
      response.status(),
      `purchase HTTP status should be an error. Body: ${JSON.stringify(body)}`
    ).toBeGreaterThanOrEqual(400);
    expect(
      body?.error?.processor_error?.code,
      `expected processor_error.code to be ${expectedErrorCode}. Body: ${JSON.stringify(body)}`
    ).toBe(expectedErrorCode);
  }

  async assertPurchasePendingResponse() {
    const response = await this.responsePromise;
    const body = await response.json();
    expect(response.status(), 'purchase status').toBe(200);
    expect(
      body?.order?.status ?? body?.order?.payment?.data?.status,
      'purchase order should be pending in this scenario'
    ).toBe('pending');
  }
}
