import { CommonsActions } from '@pages/commonActions';
import { expect, Page, Locator } from '@playwright/test';
import envConfig from '@support/envConfig';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { getTranslations } from '@translations/getTranslations';

const urlReconciliations = `${envConfig.ADMIN_URL}/reconciliations`;

export class AdminReconciliationPage extends CommonsActions {
  readonly page: Page;
  readonly selectors: AdminTranslations;
  readonly buttonGoToSettlements: Locator;
  readonly buttonGoToDataSource: Locator;
  readonly buttonExportSettlements: Locator;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);

    this.page = page;
    this.selectors = getTranslations('admin', languageCode);
    this.buttonGoToDataSource = page.getByTestId('reconciliations-filter-tab-data_source');
    this.buttonGoToSettlements = page.getByTestId('reconciliations-filter-tab-liquidations');
    this.buttonExportSettlements = page.getByTestId('export-settlements-button');
  }

  async goToSettlements() {
    await this.ensureVisibleToClick(
      this.buttonGoToSettlements,
      null,
      'Settlements tab is not visible',
      { timeout: 5000 }
    );
  }

  async goToDataSource() {
    await this.ensureVisibleToClick(
      this.buttonGoToDataSource,
      null,
      'Data Source tab is not visible',
      { timeout: 5000 }
    );
  }

  //Assertions:
  async assertExportSettlementsButtonIsVisible() {
    await this.ensureVisible(this.buttonExportSettlements, {
      timeout: 5000,
      errorMessage: 'Export Settlements button is not visible',
    });
  }

  async assertExportSettlementsButtonIsNotVisible() {
    await this.ensureNotVisible(
      this.buttonExportSettlements,
      null,
      'Export Settlements button is visible'
    );
  }
}
