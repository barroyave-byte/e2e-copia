import { expect, Locator, Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { FormHelpers, InterceptorRequest } from './formHelpers';
import { NequiTranslations } from '@support/translations/selectors/explore/nequi/nequiTranslations';
import { VoucherTranslations } from '@support/translations/selectors/voucher/voucherTranslations';

// ponytail: matches both the new (/merchants/orders) and legacy (/transactions/nequi/verify)
// endpoints. Drop the legacy branch once the old API is deprecated in staging.
const NEQUI_VERIFY_URL = /\/merchants\/orders|\/transactions\/nequi\/verify/;

export class NequiPushFormPage extends FormHelpers {
  readonly page: Page;
  readonly selectors: NequiTranslations;
  readonly inputPhoneNumber: Locator;
  nequiPushVerifyResponse: any;
  readonly labelPhoneVerification: Locator;
  readonly iconDEUNA: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);

    const voucherTranslations: VoucherTranslations = getTranslations('voucher', languageCode);

    this.page = page;
    this.selectors = getTranslations('explore/nequi', languageCode);
    this.inputPhoneNumber = page
      .locator('#phone-selector-Número\\ de\\ celular')
      .or(page.locator('[data-testid="nequi-push-phone-value-input"]')); // migration-or
    this.labelPhoneVerification = page.getByText(
      voucherTranslations.screenNequiPush.sentConfirmationText
    );
    this.iconDEUNA = page.locator('div[aria-label*="Powered by DEUNA"]');
  }

  async waitUntilLoadPage() {
    await expect(this.inputPhoneNumber).toBeVisible({ timeout: 15000 });
  }

  async fillPhoneNumber(phone: string = '3166225619') {
    await this.fillAndVerifyValue(this.iframeLocator(this.inputPhoneNumber), phone, {
      withoutSpaces: true,
    });
  }

  async waitForNequiPushVerifyResponse() {
    this.nequiPushVerifyResponse = this.page.waitForResponse(NEQUI_VERIFY_URL);
  }

  async assertNequiPushVerifyOrderStatus() {
    const verifyResponse = await this.nequiPushVerifyResponse;
    const responseBody = await verifyResponse.json();
    expect(responseBody.order.status).toBe('succeeded');
  }

  async interceptVerifyResponse(interceptorRequest: InterceptorRequest, times?: number) {
    await this.page.route(
      NEQUI_VERIFY_URL,
      async (route) => {
        await route.fulfill({
          status: interceptorRequest.status,
          contentType: 'application/json',
          body: JSON.stringify(interceptorRequest.body),
        });
      },
      { times }
    );
  }

  async interceptVerifyWebhookFlow(
    pendingBody: InterceptorRequest['body'],
    successBody: InterceptorRequest['body']
  ) {
    // Register succeeded handler first (lower priority — handles all calls after pending is exhausted)
    await this.page.route(NEQUI_VERIFY_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successBody),
      });
    });
    // Register pending handler second (higher priority in Playwright LIFO order — handles first call only)
    await this.page.route(
      NEQUI_VERIFY_URL,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(pendingBody),
        });
      },
      { times: 1 }
    );
  }

  async waitForNequiPushVerifySucceededResponse() {
    this.nequiPushVerifyResponse = this.page.waitForResponse(async (response) => {
      if (!NEQUI_VERIFY_URL.test(response.url())) return false;
      try {
        const body = await response.json();
        return body?.order?.status === 'succeeded';
      } catch {
        return false;
      }
    });
  }

  async assertPhoneVerificationPageToBeVisible() {
    await expect(this.iframeLocator(this.labelPhoneVerification)).toBeVisible();
  }

  async assertPhoneNumberToBeVisible() {
    await expect(this.iframeLocator(this.inputPhoneNumber)).toBeVisible();
  }

  async assertDEUNALogoToBeVisible() {
    await expect(this.iconDEUNA).toBeVisible();
  }
}
