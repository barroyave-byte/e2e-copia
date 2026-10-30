import { CommonsActions } from '@pages/commonActions';
import { expect, Locator } from '@playwright/test';
import { Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@support/translations/getTranslations';
import { RedirectToCommerceTranslations } from '@support/translations/selectors/redirect_to_commerce/redirectToCommerce';

export class RedirectToCommercePage extends CommonsActions {
  readonly page: Page;
  readonly selectors: RedirectToCommerceTranslations;

  readonly labelProcessingRequest: Locator;
  readonly labelCloseTab: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('redirect_to_commerce', languageCode);

    this.labelProcessingRequest = this._createRedirectToCommerceLocator('labelProcessingRequest');
    this.labelCloseTab = this._createRedirectToCommerceLocator('labelCloseTab');
  }

  private _createRedirectToCommerceLocator(
    key: keyof ReturnType<typeof this._getScreenRedirectToCommerce>
  ): Locator {
    const text = this._getScreenRedirectToCommerce()[key];
    return this.page.getByText(text);
  }

  _getScreenRedirectToCommerce() {
    return this.selectors.screenRedirectToCommerce;
  }

  async assertRedirectToCommercePage() {
    await expect(this.labelProcessingRequest).toBeVisible({ timeout: 25_000 });
  }

  async assertCloseTab() {
    await expect(this.labelCloseTab).toBeVisible({ timeout: 25_000 });
  }
}
