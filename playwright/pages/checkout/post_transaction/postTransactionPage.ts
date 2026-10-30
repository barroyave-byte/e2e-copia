import { FrameLocator, Locator, Page, expect } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { waitForPurchaseResponse } from '@support/utils/purchase';
import { getTranslations } from '@support/translations/getTranslations';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';

export class PostTransactionPage {
  readonly page: Page;
  readonly iframeZoidVisible: FrameLocator;
  readonly labelMessageTransactionSuccess: Locator;
  readonly labelMessageWrongAddressError: Locator;
  responsePromise: any;
  responsePromiseRegister: any;
  deunanowSelectors: DeunanowTranslations;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    this.page = page;
    this.deunanowSelectors = getTranslations('deunanow', languageCode);
    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');
    this.labelMessageTransactionSuccess = this.iframeZoidVisible.locator(
      'h2:has-text("¡Gracias por elegirnos!")'
    );
    this.labelMessageWrongAddressError = this.iframeZoidVisible.locator(
      'p.di.bz.do.dp.dk.dq.dr.h0'
    );
    this.responsePromise = waitForPurchaseResponse(this.page, { timeout: 280000 });
  }

  async getPostTransactionSuccessMessage() {
    const successMessagePostTransaction = await this.labelMessageTransactionSuccess.textContent();
    return successMessagePostTransaction;
  }

  async getPostTransactionWrongAddressErrorMessage() {
    await this.page.waitForTimeout(2000);
    const successMessagePostTransaction = await this.labelMessageWrongAddressError.textContent();
    return successMessagePostTransaction;
  }

  //Assertions
  async assertPostTransactionSuccessMessage() {
    let element = await this.labelMessageTransactionSuccess;
    await expect(element).toHaveText('¡Gracias por elegirnos!', { timeout: 70000 });
  }

  async assertOrderProcessedWithMessage(message: string) {
    await expect(this.iframeZoidVisible.getByText(message)).toBeVisible({ timeout: 70000 });
  }

  async assertPostTransactionWrongAddressError() {
    const successMsg = await this.getPostTransactionWrongAddressErrorMessage();
    expect(successMsg).toBe(this.deunanowSelectors.screenAlertNotifications.purchaseError);
  }
}
