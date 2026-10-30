import { faker } from '@faker-js/faker';
import { CommonsActions } from '@pages/commonActions';
import { expect, Page, Locator } from '@playwright/test';
import envConfig from '@support/envConfig';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { getTranslations } from '@translations/getTranslations';
import {
  POST_SCHEDULE_REPORT_PATH,
  reportTypes,
  type ScheduleReportType,
} from './constants/commons';
import {
  SCHEDULE_REPORT_FORM_DATA_TEST_ID,
  type ScheduleReportPeriodicity,
  type ScheduleReportTiming,
} from './constants/scheduleReportForm';
import { AdminDatePicker } from './components/atoms/adminDatePicker';

const urlScheduleReport = `${envConfig.ADMIN_URL}/reports/schedule`;

export class AdminScheduleReportsPage extends CommonsActions {
  readonly page: Page;
  readonly selectors: AdminTranslations;
  readonly buttonNextStep: Locator;
  readonly buttonOpenFiltersModal: Locator;
  readonly buttonOpenFieldsModal: Locator;
  readonly categoryFilterItems: Locator;
  readonly buttonSaveModal: Locator;
  readonly buttonSaveFields: Locator;
  readonly buttonSaveFilters: Locator;
  readonly buttonCreateScheduleReport: Locator;
  readonly checkboxSelectAllFields: Locator;
  readonly checkboxSelectAllFieldsOrders: Locator;
  readonly sectionFirstStepScheduleReport: Locator;
  readonly sectionSecondStepScheduleReport: Locator;
  readonly sectionThirdStepScheduleReport: Locator;
  readonly inputNameScheduleReport: Locator;
  readonly selectReportType: Locator;
  readonly inputStartDate: Locator;
  readonly inputStartDateContainer: Locator;
  readonly inputStartDateApplyButton: Locator;
  readonly inputEndDate: Locator;
  readonly inputNoEndDate: Locator;
  readonly inputFilters: Locator;
  readonly errorMessageName: Locator;
  readonly errorMessageStartDate: Locator;
  readonly errorMessageEndDate: Locator;
  readonly buttonCloseSuccessModal: Locator;
  readonly selectFilterMerchants: Locator;
  readonly checkboxOptionFilterMerchantsAll: Locator;
  readonly comboboxMerchantsSelector: Locator;
  readonly comboboxMerchantsSelectorContent: Locator;
  readonly monthlyFrequency: Locator;
  readonly optionScheduleReportFilterType: (reportType: string) => Locator;
  readonly merchantOptions: Locator;

  // Single-page "Schedule Report" form (admin-ff v2 redesign — replaces the step wizard above).
  readonly comboboxReportSourceTrigger: Locator;
  readonly sectionConditionFilters: Locator;
  readonly buttonAddConditionFilter: Locator;
  readonly conditionFilterRowSelect: Locator;
  readonly conditionFilterCategoryListbox: Locator;
  readonly conditionFilterFirstCategoryOption: Locator;
  readonly conditionFilterValueTrigger: Locator;
  readonly conditionFilterValueListbox: Locator;
  readonly conditionFilterFirstValueOption: Locator;
  readonly buttonSaveConditionFilter: Locator;
  readonly comboboxPersonalizadoReportTrigger: Locator;
  readonly comboboxPersonalizadoReportListbox: Locator;
  readonly personalizadoReportLastOption: Locator;
  readonly timingCardOption: (timing: ScheduleReportTiming) => Locator;
  readonly periodicityCardOption: (periodicity: ScheduleReportPeriodicity) => Locator;
  readonly columnPickerFirstGroupTrigger: Locator;
  readonly columnPickerFirstColumnCheckbox: Locator;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);

    this.page = page;
    this.selectors = getTranslations('admin', languageCode);
    this.buttonCloseSuccessModal = page.getByRole('button', {
      name: this.selectors.screenReportsHistory.buttonCloseSuccessModal,
    });
    this.sectionFirstStepScheduleReport = page.getByTestId('layout-step-1');
    this.sectionSecondStepScheduleReport = page.getByTestId('layout-step-2');
    this.sectionThirdStepScheduleReport = page.getByTestId('layout-step-3');
    this.inputNameScheduleReport = page.getByTestId('schedule-report-input-name');
    this.selectReportType = page.getByTestId('schedule-report-filters-combobox-container-trigger');
    this.comboboxMerchantsSelector = page.getByTestId(
      'schedule-report-merchants-filter-select-combobox-input-search'
    );
    this.comboboxMerchantsSelectorContent = page.getByTestId(
      'schedule-report-merchants-filter-select-combobox-listbox'
    );
    this.buttonNextStep = page.getByTestId('schedule-report-button-next-step');
    this.inputStartDate = this.page.getByTestId(
      'schedule-report-vigency-start-date-input-date-range'
    );
    this.inputStartDateContainer = this.page.getByTestId(
      'schedule-report-vigency-start-date-container-floating-content'
    );
    this.inputStartDateApplyButton = this.page.getByTestId(
      'schedule-report-vigency-start-date-button-apply'
    );
    this.inputEndDate = this.page.getByTestId('schedule-report-vigency-end-date-input-date-range');
    this.inputNoEndDate = this.sectionSecondStepScheduleReport.getByTestId('vigency-no-end-date');
    this.buttonOpenFiltersModal = page.getByTestId('schedule-report-button-add-filters');
    this.buttonOpenFieldsModal = page.getByTestId('schedule-report-button-add-columns');
    this.categoryFilterItems = page.locator(
      '[data-testid^="schedule-report-export-filters-item-"]'
    );
    this.inputFilters = page.getByTestId('schedule-report-export-filters-input-search');
    this.buttonSaveModal = page.getByTestId('export-filters-drawer-buttons:save');
    this.buttonSaveFilters = page.getByTestId('export-filters-drawer-buttons:save');
    this.buttonSaveFields = page.getByTestId('schedule-report-export-fields-drawer-buttons:save');
    this.checkboxSelectAllFields = page.getByTestId('schedule-report-column-picker-select-all');
    this.checkboxSelectAllFieldsOrders = page.getByTestId('export-orders-select-all');
    this.errorMessageName = page.getByTestId('schedule-report-input-name-error-message');
    this.errorMessageStartDate = page.getByTestId(
      'schedule-report-vigency-start-date-error-message'
    );
    this.errorMessageEndDate = page.getByTestId('schedule-report-vigency-end-date-error-message');
    this.buttonCreateScheduleReport = page.getByTestId('reports-strategy-button-save');
    this.selectFilterMerchants = page.getByTestId(
      'schedule-report-merchants-filter-select-combobox-container-trigger'
    );
    this.checkboxOptionFilterMerchantsAll = page.getByTestId(
      'schedule-report-merchants-filter-select-option-all'
    );

    this.monthlyFrequency = page.getByTestId('schedule-report-type-card-monthly');
    this.optionScheduleReportFilterType = (reportType: string) =>
      page.getByTestId(`schedule-report-filters-option-${reportType}`);
    this.merchantOptions = page.locator(
      '[data-testid^="schedule-report-merchants-filter-select-option-"]'
    );

    this.comboboxReportSourceTrigger = page
      .getByTestId('schedule-report-filters-combobox-container-trigger')
      .filter({ has: page.getByTestId('schedule-report-filters-combobox-button-clear') });
    this.comboboxPersonalizadoReportTrigger = page.getByTestId(
      'schedule-report-ad-hoc-combobox-container-trigger'
    );
    this.comboboxPersonalizadoReportListbox = page.getByTestId(
      'schedule-report-ad-hoc-combobox-listbox'
    );
    this.personalizadoReportLastOption = this.comboboxPersonalizadoReportListbox
      .getByRole('option')
      .last();
    this.timingCardOption = (timing: ScheduleReportTiming) =>
      page.getByTestId(SCHEDULE_REPORT_FORM_DATA_TEST_ID.timingCard(timing));
    this.periodicityCardOption = (periodicity: ScheduleReportPeriodicity) =>
      page.getByTestId(SCHEDULE_REPORT_FORM_DATA_TEST_ID.periodicityCard(periodicity));
    this.sectionConditionFilters = page.getByTestId('schedule-report-condition-filters');
    this.buttonAddConditionFilter = page.getByTestId(
      'schedule-report-condition-filters-add-select'
    );
    this.conditionFilterRowSelect = page
      .locator(
        '[data-testid^="schedule-report-condition-filters-row-"][data-testid$="-condition-select"]'
      )
      .first();
    this.conditionFilterCategoryListbox = page.locator(
      '[data-testid*="-condition-select-listbox"]'
    );
    this.conditionFilterFirstCategoryOption = this.conditionFilterCategoryListbox
      .getByRole('option')
      .first();
    this.conditionFilterValueTrigger = page.locator(
      '[data-testid^="schedule-report-condition-filters-row-"][data-testid$="-trigger"]'
    );
    this.conditionFilterValueListbox = page.locator(
      '[data-testid$="-listbox"]:not([data-testid*="-condition-select-listbox"])'
    );
    this.conditionFilterFirstValueOption = this.conditionFilterValueListbox
      .getByRole('option')
      .first();
    this.buttonSaveConditionFilter = page.locator(
      '[data-testid^="schedule-report-condition-filters-row-"][data-testid$="-save-button"]'
    );
    this.columnPickerFirstGroupTrigger = page
      .locator('[data-testid^="schedule-report-column-picker-group-"]')
      .first();
    this.columnPickerFirstColumnCheckbox = page
      .locator('[data-testid^="schedule-report-column-picker-column-"]')
      .first();
  }

  async selectStartDate() {
    const adminDatePicker = new AdminDatePicker(this.page);
    await adminDatePicker.assertIsVisible(this.inputStartDate);
    await adminDatePicker.assertIsNotVisible(this.inputStartDateContainer);
    await adminDatePicker.click(this.inputStartDate, { force: true });
    await adminDatePicker.assertIsVisible(this.inputStartDateContainer);
    await adminDatePicker.selectFirstEnabledDate(
      this.inputStartDateContainer,
      this.inputStartDateApplyButton
    );
    await adminDatePicker.assertIsNotVisible(this.inputStartDateContainer);
  }

  async selectEndDate() {
    const adminDatePicker = new AdminDatePicker(this.page);
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    await adminDatePicker.selectRangeDateByTestId(
      'schedule-report-vigency-end-date',
      nextMonthDate,
      nextMonthDate
    );
  }

  async completeFirstStepScheduleReport(reportType?: keyof typeof reportTypes) {
    const date = new Date().toISOString();
    await expect(
      this.inputNameScheduleReport,
      'The schedule report name input is not visible'
    ).toBeVisible({ timeout: 40000 });
    await this.inputNameScheduleReport.fill(`E2E Test ${date}`);

    if (reportType) {
      await this.ensureVisibleToClick(this.selectReportType);
      const option = this.optionScheduleReportFilterType(reportType);
      await expect(option).toBeVisible({ timeout: 10000 });
      await this.ensureVisibleToClick(option);
    }
  }

  async assertMerchantsSelectorInStep2(merchantsCount: number) {
    await expect(this.selectFilterMerchants, 'The merchants filter is not visible').toBeVisible({
      timeout: 40000,
    });
    await this.selectFilterMerchants.click();

    await expect(
      this.checkboxOptionFilterMerchantsAll,
      'The merchants list did not open'
    ).toBeVisible({ timeout: 40000 });
    await expect(this.merchantOptions, 'The merchant options did not load').toHaveCount(
      merchantsCount + 1,
      { timeout: 40000 }
    );

    // Parent-account forms pre-select every network merchant. Clicking "Select all"
    // while it is already selected would clear the selection.
    const isAllSelected =
      (await this.checkboxOptionFilterMerchantsAll.getAttribute('aria-selected')) === 'true' ||
      (await this.checkboxOptionFilterMerchantsAll.getAttribute('data-selected')) === 'true';
    if (!isAllSelected) {
      await this.checkboxOptionFilterMerchantsAll.click();
    }

    for (const merchantOption of await this.merchantOptions.all()) {
      await expect(merchantOption, 'The merchant option was not selected').toHaveAttribute(
        'aria-selected',
        'true',
        { timeout: 40000 }
      );
    }

    await this.page.keyboard.press('Escape');
    await expect(
      this.checkboxOptionFilterMerchantsAll,
      'The merchants list stayed open'
    ).toBeHidden({ timeout: 40000 });
  }

  async completeSecondStepScheduleReport() {
    await this.ensureVisibleToClick(this.inputNoEndDate);
    await this.selectStartDate();
    await this.ensureVisibleToClick(this.buttonNextStep);
  }

  async completeThirdStepScheduleReport(reportType: ScheduleReportType = 'reconciliations') {
    if (reportType === 'orders') {
      await this.ensureVisibleToClick(this.comboboxMerchantsSelector);
      await this.ensureVisibleToClick(this.selectFilterMerchants);
      await expect(this.checkboxOptionFilterMerchantsAll).toBeVisible({ timeout: 10000 });
      const isAllChecked =
        (await this.checkboxOptionFilterMerchantsAll.getAttribute('aria-selected')) === 'true' ||
        (await this.checkboxOptionFilterMerchantsAll.getAttribute('data-selected')) === 'true';
      if (!isAllChecked) {
        await this.ensureVisibleToClick(this.checkboxOptionFilterMerchantsAll);
      }
      // Close the merchants combobox so its option list stops overlaying the buttons below
      await this.page.keyboard.press('Escape');
      await expect(this.checkboxOptionFilterMerchantsAll).toBeHidden({ timeout: 10000 });
      await this.ensureVisibleToClick(this.buttonOpenFiltersModal);
      await this.ensureVisibleToClick(this.buttonSaveFilters);
    } else {
      await this.ensureVisibleToClick(this.buttonOpenFiltersModal);
      await expect(this.categoryFilterItems.first()).toBeVisible({
        timeout: 10000,
      });
      await this.ensureVisibleToClick(this.categoryFilterItems.first());
      await expect(this.inputFilters.first()).toBeVisible({ timeout: 10000 });
      await this.ensureVisibleToClick(this.inputFilters);
      await this.ensureVisibleToClick(this.buttonSaveModal);
      await this.ensureVisibleToClick(this.buttonSaveFilters);
    }

    await this.ensureVisibleToClick(this.buttonNextStep);
  }

  async completeFourthStepScheduleReport(reportType: ScheduleReportType = 'reconciliations') {
    const selectAllCheckbox = this.checkboxSelectAllFields;
    await expect(selectAllCheckbox).toBeVisible({ timeout: 10000 });
    await selectAllCheckbox.scrollIntoViewIfNeeded();
    await expect(selectAllCheckbox).toBeInViewport();
    await this.ensureVisibleToClick(selectAllCheckbox);
  }

  async createScheduleReport() {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        (new RegExp(POST_SCHEDULE_REPORT_PATH).test(response.url()) ||
          response.url().includes('/networks/reports/schedules')) &&
        response.request().method() === 'POST',
      { timeout: 40000 }
    );
    await expect(
      this.buttonCreateScheduleReport,
      'The schedule report save button is not enabled'
    ).toBeEnabled({ timeout: 40000 });
    await this.ensureVisibleToClick(
      this.buttonCreateScheduleReport,
      undefined,
      'The schedule report save button is not visible',
      { timeout: 40000 }
    );
    expect((await responsePromise).ok()).toBe(true);
  }

  async closeScheduleReportSuccessModal() {
    await this.buttonCloseSuccessModal.click();
  }

  /**
   * @description Temporary workaround to simulate that scheduled report creation works correctly.
   *              This avoids a 500 error because the backend doesn't support creating scheduled
   *              reports for networks (Parent Accounts) that were recently created by a E2E test.
   *              We intercept the create schedule report request and return a mock response with status 202.
   */
  async interceptCreateScheduleReport() {
    await this.page.route('**/reports/schedule**', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({
            id: faker.string.uuid(),
            file_name: body?.file_name ?? 'e2e-mock',
            status: 'Active',
            created_at: faker.date.past(),
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  async fillReportName(name: string = `E2E Test ${new Date().toISOString()}`) {
    await expect(this.inputNameScheduleReport).toBeVisible();
    await this.inputNameScheduleReport.fill(name);
  }

  async selectReportSource(source: string = 'merchant_source') {
    await this.ensureVisibleToClick(this.comboboxReportSourceTrigger);
    const option = this.optionScheduleReportFilterType(source);
    await expect(option).toBeVisible({ timeout: 10000 });
    await this.ensureVisibleToClick(option);
  }

  async selectLastPersonalizadoReportOption() {
    await expect(this.comboboxPersonalizadoReportTrigger).toBeVisible({ timeout: 10000 });
    await this.ensureVisibleToClick(this.comboboxPersonalizadoReportTrigger);
    await expect(this.comboboxPersonalizadoReportListbox).toBeVisible({ timeout: 10000 });
    await this.ensureVisibleToClick(this.personalizadoReportLastOption);
  }

  async selectTiming(timing: ScheduleReportTiming) {
    const card = this.timingCardOption(timing);
    await expect(card).toBeVisible({ timeout: 10000 });
    await this.ensureSelected(card);
  }

  async selectPeriodicity(periodicity: ScheduleReportPeriodicity) {
    const card = this.periodicityCardOption(periodicity);
    await expect(card).toBeVisible({ timeout: 10000 });
    await this.ensureVisibleToClick(card);
  }

  async addConditionFilter() {
    await this.ensureVisibleToClick(this.buttonAddConditionFilter);
    await expect(this.conditionFilterRowSelect).toBeVisible({ timeout: 10000 });
    await this.ensureVisibleToClick(this.conditionFilterRowSelect);

    await expect(this.conditionFilterCategoryListbox).toBeVisible({ timeout: 10000 });
    await this.ensureVisibleToClick(this.conditionFilterFirstCategoryOption);

    await expect(this.conditionFilterValueTrigger).toBeVisible({ timeout: 10000 });
    await this.ensureVisibleToClick(this.conditionFilterValueTrigger);
    await expect(this.conditionFilterValueListbox).toBeVisible({ timeout: 10000 });
    await this.ensureVisibleToClick(this.conditionFilterFirstValueOption);

    await this.ensureVisibleToClick(this.buttonSaveConditionFilter);
  }

  async expandFirstColumnGroupAndSelectColumn() {
    await expect(this.columnPickerFirstGroupTrigger).toBeVisible({ timeout: 10000 });
    const isExpanded = await this.columnPickerFirstGroupTrigger.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await this.ensureVisibleToClick(this.columnPickerFirstGroupTrigger);
    }
    await this.ensureVisibleToClick(this.columnPickerFirstColumnCheckbox);
  }

  async submitScheduleReportForm() {
    const responsePromise = this.waitForPostResponse(POST_SCHEDULE_REPORT_PATH, 200);
    await this.ensureVisibleToClick(this.buttonCreateScheduleReport);
    await responsePromise;
  }

  //Assertions:
  async assertPresenceInScheduleReportPage(reportType: ScheduleReportType) {
    await expect(this.page, `The ${reportType} schedule report form is not visible`).toHaveURL(
      urlScheduleReport
    );
  }

  async assertScheduleReportStepCompleted(step: Locator, expectedResult: boolean = true) {
    const dataStateValue = await step.getAttribute('data-state');
    const hasCompletedClass = dataStateValue === 'completed';
    expect(hasCompletedClass).toBe(expectedResult);
  }

  async assertScheduleReportCreated() {
    const responsePromise = this.waitForPostResponse(POST_SCHEDULE_REPORT_PATH, 200);
    await responsePromise;
  }

  async assertScheduleReportNameRequired() {
    await this.inputNameScheduleReport.fill('Report name');
    await expect(this.inputNameScheduleReport).toHaveValue('Report name');
    await this.inputNameScheduleReport.clear();
    await this.inputNameScheduleReport.blur();
    await this.ensureVisible(this.errorMessageName, { timeout: 5000 });
    await expect(this.buttonCreateScheduleReport).toBeDisabled();
  }

  async assertScheduleReportNameValid() {
    await expect(this.inputNameScheduleReport).not.toHaveValue('');
    await expect(this.errorMessageName).toBeHidden();
  }

  async assertMonthlyFrequencySelected() {
    await expect(this.monthlyFrequency).toBeChecked();
  }

  async assertScheduleReportVigencyRequired() {
    await this.ensureVisibleToClick(this.buttonNextStep, null, 'Next step button is not visible', {
      timeout: 4000,
    });
    await this.ensureVisible(this.errorMessageStartDate, { timeout: 5000 });
    await this.ensureVisible(this.errorMessageEndDate, { timeout: 5000 });

    await this.assertScheduleReportStepCompleted(this.sectionSecondStepScheduleReport, false);
    await this.selectStartDate();

    await this.ensureVisibleToClick(this.buttonNextStep, null, 'Next step button is not visible', {
      timeout: 4000,
    });

    await this.ensureNotVisible(this.errorMessageStartDate);
    await this.ensureVisible(this.errorMessageEndDate, { timeout: 5000 });

    await this.assertScheduleReportStepCompleted(this.sectionSecondStepScheduleReport, false);
    await this.selectEndDate();

    await this.ensureNotVisible(this.errorMessageEndDate);

    await this.ensureVisibleToClick(this.buttonNextStep);
    await expect(this.inputEndDate).not.toBeVisible({ timeout: 10000 });
  }
}
