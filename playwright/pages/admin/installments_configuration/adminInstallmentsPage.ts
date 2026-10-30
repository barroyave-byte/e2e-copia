import { CommonsActions } from '@pages/commonActions';
import type { Locator, Page } from '@playwright/test';
import type { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { getTranslations } from '@support/translations/getTranslations';
import type { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';

export class AdminInstallmentsPage extends CommonsActions {
  protected page: Page;
  readonly selectors: AdminTranslations;

  readonly buttonCreateCampaign: Locator;
  readonly headingCreateCampaign: Locator;

  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);

    this.page = page;
    this.selectors = getTranslations('admin', languageCode);

    this.headingCreateCampaign = page.getByTestId('config-installments-title');
    this.buttonCreateCampaign = page.getByTestId('config-installments-create-campaign-button');
  }

  async createCampaignClick() {
    await this.clickAndVerifyLabel(this.buttonCreateCampaign, this.headingCreateCampaign);
  }
}
