import { CommonsActions } from '@pages/commonActions';
import { FrameLocator, Locator, Page, expect } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@translations/getTranslations';
import { AplazoTranslations } from '@support/translations/selectors/explore/aplazo/aplazoTranslations';

export class AplazoReferencePayModalPage extends CommonsActions {
  readonly page: Page;
  readonly selectors: AplazoTranslations;
  readonly iframeZoidVisible: FrameLocator;
  readonly labelErrorCode: Locator;
  readonly buttonErrorBack: Locator;
  readonly selectOptionScreen: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;

    this.selectors = getTranslations('explore/aplazo', languageCode);
    this.iframeZoidVisible = page.frameLocator('iframe.zoid-visible');
    this.labelErrorCode = page.getByText('DP-7100');
    this.buttonErrorBack = this.iframeZoidVisible.locator('button:has-text("Volver")');
    this.selectOptionScreen = this.page.getByText(
      this.selectors.screenAplazoPayModal.labelChoosePaymentMethod
    );
  }

  async assertFormErrorScreen() {
    await expect(this.iframeZoidVisible.locator(this.labelErrorCode)).toBeVisible({
      timeout: 30000,
    });
  }

  async assertBackButtonWorks() {
    await this.iframeZoidVisible.locator(this.page.locator('div[data-testid="error"]')).isVisible();
    await this.ensureVisibleToClick(this.buttonErrorBack);
    await expect(this.selectOptionScreen).toBeVisible();
  }
}
