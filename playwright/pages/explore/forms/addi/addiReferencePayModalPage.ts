import { CommonsActions } from '@pages/commonActions';
import { FrameLocator, Locator, Page, expect } from '@playwright/test';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { waitForPurchaseResponse } from '@support/utils/purchase';

export class AddiReferencePayModalPage extends CommonsActions {
  readonly page: Page;
  readonly iframeZoidVisible: FrameLocator;

  // Define locators as properties
  readonly userDocumentIdInput: Locator;
  readonly phoneNumberInput: Locator;
  readonly billingAddressInput: Locator;
  readonly departmentSelect: Locator;
  readonly citySelect: Locator;
  readonly departmentOption: Locator;
  readonly cityOption: Locator;
  readonly payButton: Locator;
  readonly paymentLinkContainer: Locator;
  readonly cancelButton: Locator;
  readonly iframeBody: Locator;
  readonly validationErrors: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');

    // Initialize locators within the iframe
    this.iframeBody = this.iframeZoidVisible.locator('body');
    this.validationErrors = this.iframeZoidVisible.locator(
      'p[role="alert"], [data-testid$="-error-icon"], [id$="-error"]'
    );
    this.userDocumentIdInput = this.iframeZoidVisible
      .locator('input[id="userDocumentId-input"]')
      .or(this.iframeZoidVisible.locator('[data-testid="userDocumentId-value-input"]')); // migration-or
    this.phoneNumberInput = this.iframeZoidVisible
      .locator('[data-testid="phone-value-input"]')
      .or(this.iframeZoidVisible.locator('[data-testid="addi-phone-value-input"]'));
    this.billingAddressInput = this.iframeZoidVisible
      .locator('#address')
      .or(this.iframeZoidVisible.locator('#input-billing-address1'));
    this.departmentSelect = this.iframeZoidVisible
      .locator('[data-testid="dropdown-input-department"], #department')
      .first();
    this.citySelect = this.iframeZoidVisible
      .locator('[data-testid="dropdown-input-cityName"], #cityName')
      .first();
    this.departmentOption = this.iframeZoidVisible
      .locator('[data-testid^="dropdown-item-"], [role="option"]')
      .first();
    this.cityOption = this.iframeZoidVisible
      .locator('[data-testid^="dropdown-item-"], [role="option"]')
      .first();
    this.payButton = this.iframeZoidVisible.locator('#payment-button');
    this.paymentLinkContainer = this.iframeZoidVisible.locator('#payment_link_container');
    this.cancelButton = this.iframeZoidVisible
      .getByTestId('changeMethod-button')
      .or(this.iframeZoidVisible.locator('button[data-testid="changeMethod-button"]'));
  }

  async fillFormData() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.iframeBody.waitFor({ state: 'visible', timeout: 30000 });
    await this.userDocumentIdInput.clear();
    await this.userDocumentIdInput.fill(IDENTITY_DOCUMENTS.CO.CC);
    await this.phoneNumberInput.fill('322 2222222');
    await this.billingAddressInput.fill('Test Address 123');

    await this.departmentSelect.click();
    // Bounded: the widget sometimes opens this list with no options even though the states
    // request succeeded, and an unbounded wait burned the whole 240 s test timeout.
    await expect(
      this.departmentOption,
      'The department dropdown opened without options'
    ).toBeVisible({ timeout: 15_000 });
    await this.departmentOption.click();

    await this.citySelect.click();
    await expect(this.cityOption, 'The city dropdown opened without options').toBeVisible({
      timeout: 15_000,
    });
    await this.cityOption.click();
  }

  async clickOnPay() {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const responsePromise = waitForPurchaseResponse(this.page, { timeout: 30_000 });
        await this.payButton.click();
        const response = await responsePromise;
        expect(response.status()).toBe(200);
        return;
      } catch (e) {
        if (attempt === maxRetries) throw e;
        await this.page.waitForTimeout(1000 * attempt); // Exponential backoff
      }
    }
  }

  async waitUntilVisible(timeout = 30000) {
    await this.iframeBody.waitFor({ state: 'visible', timeout });
  }

  async submitEmptyForm() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.iframeBody.waitFor({ state: 'visible', timeout: 30000 });
    await this.payButton.click();
  }

  async assertValidationErrorsVisible() {
    await expect(this.validationErrors.first()).toBeVisible({ timeout: 10000 });
  }

  async cancelPurchase() {
    await this.cancelButton.click();
    await expect(this.paymentLinkContainer).toBeHidden();
  }
}
