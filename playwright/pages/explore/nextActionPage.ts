import { expect, Locator, Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { FormHelpers } from './forms/formHelpers';
import { getTranslations } from '@translations/getTranslations';
import { PayUPseTranslations } from '@support/translations/selectors/explore/payupse/payupseTranslations';

export class NextActionPage extends FormHelpers {
  readonly page: Page;
  readonly selectors: PayUPseTranslations;
  readonly buttonGoToSiteButton: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;

    this.selectors = getTranslations('explore/payupse', languageCode);
    this.buttonGoToSiteButton = page.getByTestId('go_to_site-button');
  }

  async assertGoToSiteButtonVisible(timeout: number = 20000) {
    await expect(this.page.locator('iframe.zoid-visible')).toBeVisible({ timeout });
    await expect(this.iframeLocator(this.buttonGoToSiteButton)).toBeVisible({ timeout });
  }

  async clickGoToSiteButton() {
    await this.ensureVisibleToClick(
      this.iframeLocator(this.buttonGoToSiteButton),
      undefined,
      undefined,
      { timeout: 40000 }
    );
  }
}
