import { expect, type Locator, type Page } from '@playwright/test';
import { AdminDatePicker } from '../components/atoms/adminDatePicker';
import { AdminSubscriptionsPlanPage } from './adminSubscriptionsPlanPage';

const EXPORT_CREATED_AT_DATE_PICKER = 'export-subscriptions-created-at-date-range-picker';

export class AdminSubscriptionsPage extends AdminSubscriptionsPlanPage {
  readonly page: Page;

  readonly buttonTabSubscriptions: Locator;
  readonly tableHeaderIdSubscription: Locator;
  readonly tableHeaderEmail: Locator;
  readonly tableHeaderPlanNameSubscriptions: Locator;
  readonly tableHeaderBillingAmountSubscriptions: Locator;
  readonly tableHeaderCreatedAtSubscriptions: Locator;
  readonly tableHeaderCreatedAtEndSubscriptions: Locator;
  readonly tableHeaderStatusSubscriptions: Locator;
  readonly actionablesButtonDetailsSubscription: Locator;
  readonly actionablesButtonPauseSubscription: Locator;
  readonly actionablesButtonReactivateSubscription: Locator;
  readonly dropdownIconButton: Locator;
  readonly subscriptionsTableDropdownOptionView: Locator;
  readonly buttonOpenExportSubscriptions: Locator;
  readonly inputExportReportName: Locator;
  readonly selectExportReportType: Locator;
  readonly optionExportReportType: (reportType: string) => Locator;
  readonly inputExportStatus: Locator;
  readonly optionExportStatusActive: Locator;
  readonly inputExportPlanId: Locator;
  readonly inputExportCreatedAt: Locator;
  readonly exportCreatedAtDialog: Locator;
  readonly exportCreatedAtNextMonth: Locator;
  readonly exportCreatedAtPrevMonth: Locator;
  readonly exportCreatedAtConfirm: Locator;
  readonly checkboxExportAllColumns: Locator;
  readonly buttonExportSubscriptions: Locator;
  readonly buttonExportCancel: Locator;

  private readonly datePicker: AdminDatePicker;

  //Locators
  constructor(page: Page) {
    super(page);
    this.page = page;

    this.tableHeaderIdSubscription = page
      .locator('[data-testid^="subscriptions-table-column-id-"]')
      .first();
    this.tableHeaderEmail = page
      .locator('[data-testid^="subscriptions-table-column-email-"]')
      .first();
    this.tableHeaderPlanNameSubscriptions = page
      .locator('[data-testid^="subscriptions-table-column-name-"]')
      .first();
    this.tableHeaderBillingAmountSubscriptions = page
      .locator('[data-testid^="subscriptions-table-column-billing-amount-"]')
      .first();
    this.tableHeaderCreatedAtSubscriptions = page
      .locator('[data-testid^="subscriptions-table-column-created-at-"]')
      .first();
    this.tableHeaderCreatedAtEndSubscriptions = page
      .locator('[data-testid^="subscriptions-table-column-created-end-"]')
      .first();
    this.tableHeaderStatusSubscriptions = page
      .locator('[data-testid^="subscriptions-table-column-status-"]')
      .first();

    this.buttonTabSubscriptions = page.getByTestId('subscriptions-filter-tab-subscriptions');
    this.actionablesButtonDetailsSubscription = page.getByTestId(
      'subscription-detail-button-actionables'
    );
    this.actionablesButtonPauseSubscription = page.getByTestId('subscription-detail-button-pause');
    this.actionablesButtonReactivateSubscription = page.getByTestId(
      'subscription-detail-button-resume'
    );
    this.dropdownIconButton = page
      .locator('[data-testid^="subscriptions-table-row-"][data-testid$="-button-actionables"]')
      .first();
    this.subscriptionsTableDropdownOptionView = page.locator(
      '[data-testid^="subscriptions-table-row-"][data-testid$="-button-view"]'
    );
    this.buttonOpenExportSubscriptions = page.getByTestId('subscriptions-button-export');
    this.inputExportReportName = page.getByTestId('export-subscriptions-input-report-name');
    this.selectExportReportType = page.getByTestId(
      'export-subscriptions-select-report-type-container'
    );
    this.optionExportReportType = (reportType: string) =>
      page.getByTestId(`export-subscriptions-option-report-type-${reportType}`);
    this.inputExportStatus = page.getByTestId('status-combobox-input-search');
    this.optionExportStatusActive = page.getByTestId('status-option-active');
    this.inputExportPlanId = page.getByTestId('plan_id-input-search');
    this.inputExportCreatedAt = page.getByTestId(EXPORT_CREATED_AT_DATE_PICKER);
    this.exportCreatedAtDialog = page.getByTestId(`${EXPORT_CREATED_AT_DATE_PICKER}-dialog`);
    this.exportCreatedAtNextMonth = page.getByTestId(
      `${EXPORT_CREATED_AT_DATE_PICKER}-button-next-month`
    );
    this.exportCreatedAtPrevMonth = page.getByTestId(
      `${EXPORT_CREATED_AT_DATE_PICKER}-button-prev-month`
    );
    this.exportCreatedAtConfirm = page.getByTestId(
      `${EXPORT_CREATED_AT_DATE_PICKER}-button-confirm`
    );
    this.checkboxExportAllColumns = page.getByTestId(
      'export-subscriptions-checkbox-select-all-columns'
    );
    this.buttonExportSubscriptions = page.getByTestId('export-subscriptions-button-export');
    this.buttonExportCancel = page.getByTestId('export-subscriptions-button-cancel');
    this.datePicker = new AdminDatePicker(page);
  }

  async clickTabSubscriptions(): Promise<void> {
    await expect(this.buttonTabSubscriptions)
      .toBeVisible()
      .then(() => this.buttonTabSubscriptions.click());
  }

  async openExportSubscriptions(reportName: string): Promise<void> {
    await this.ensureVisibleToClick(
      this.buttonOpenExportSubscriptions,
      undefined,
      'The export subscriptions button should be visible',
      { timeout: 40_000 }
    );
    await expect(
      this.inputExportReportName,
      'The export report name input should be visible'
    ).toBeVisible();
    await this.inputExportReportName.fill(reportName);
  }

  async chooseExportReportType(reportType: string): Promise<void> {
    await this.ensureVisibleToClick(
      this.selectExportReportType,
      undefined,
      'The export report type selector should be visible',
      { timeout: 40_000 }
    );
    await this.ensureVisibleToClick(
      this.optionExportReportType(reportType),
      undefined,
      `The export report type option '${reportType}' should be visible`,
      { timeout: 40_000 }
    );
  }

  async selectActiveExportStatus(): Promise<void> {
    await this.ensureVisibleToClick(
      this.inputExportStatus,
      undefined,
      'The export status input should be visible',
      { timeout: 40_000 }
    );
    await this.ensureVisibleToClick(
      this.optionExportStatusActive,
      undefined,
      'The active export status option should be visible',
      { timeout: 40_000 }
    );
  }

  async fillExportPlanId(planId: string): Promise<void> {
    await expect(this.inputExportPlanId, 'The export Plan ID input should be visible').toBeVisible({
      timeout: 40_000,
    });
    await this.inputExportPlanId.fill(planId);
    await expect(
      this.inputExportPlanId,
      `The export Plan ID input should contain '${planId}'`
    ).toHaveValue(planId);
  }

  async selectAllExportColumns(): Promise<void> {
    await expect(
      this.checkboxExportAllColumns,
      'The select all export columns checkbox should be visible'
    ).toBeVisible();
    await this.checkboxExportAllColumns.click();
    await expect(
      this.checkboxExportAllColumns,
      'All export columns should be selected'
    ).toHaveAttribute('data-state', 'checked');
  }

  async selectExportCreatedAtRange(startDate: Date, endDate: Date): Promise<void> {
    await expect(
      this.inputExportCreatedAt,
      'The export creation date picker should be visible'
    ).toBeVisible({ timeout: 40_000 });
    await this.inputExportCreatedAt.click();

    await expect(
      this.exportCreatedAtDialog,
      'The export creation date dialog should be visible'
    ).toBeVisible({ timeout: 40_000 });
    await this.datePicker.selectOneDate(
      startDate,
      this.exportCreatedAtDialog,
      this.exportCreatedAtNextMonth,
      this.exportCreatedAtPrevMonth
    );
    await this.datePicker.selectOneDate(
      endDate,
      this.exportCreatedAtDialog,
      this.exportCreatedAtNextMonth,
      this.exportCreatedAtPrevMonth
    );
    await this.ensureVisibleToClick(
      this.exportCreatedAtConfirm,
      undefined,
      'The export creation date confirm button should be visible',
      { timeout: 40_000 }
    );
    // The popover keeps intercepting pointer events while it closes; a click on the next control
    // during that window can be swallowed (ADM-T913 left "select all columns" unchecked).
    await expect(
      this.exportCreatedAtDialog,
      'The export creation date dialog should close after confirming the range'
    ).toBeHidden();
  }

  async assertSubscriptionsTable(): Promise<void> {
    await expect(this.tableHeaderIdSubscription).toBeVisible();
    await expect(this.tableHeaderEmail).toBeVisible();
    await expect(this.tableHeaderPlanNameSubscriptions).toBeVisible();
    await expect(this.tableHeaderBillingAmountSubscriptions).toBeVisible();
    await expect(this.tableHeaderCreatedAtSubscriptions).toBeVisible();
    await expect(this.tableHeaderCreatedAtEndSubscriptions).toBeVisible();
    await expect(this.tableHeaderStatusSubscriptions).toBeVisible();
  }

  /**
   * @description From a loaded subscription table,
   *              selects the first row and clicks on the details button
   */
  async clickAtSubscriptionDetailsFromTable(): Promise<void> {
    // Select a row positioned at Nth position in the DOM
    await expect(this.dropdownIconButton).toBeVisible();
    await this.dropdownIconButton.click();

    // Click on see details
    await this.subscriptionsTableDropdownOptionView.click();
  }

  /**
   * @description Wait to actionables button be visible from a subscription details page
   */
  async assertSubscriptionActionableInDetails(): Promise<void> {
    await expect(this.actionablesButtonDetailsSubscription).toBeVisible();
  }

  async clickSubscriptionActionablePause(): Promise<void> {
    // Click on actionables button to expand options
    await this.actionablesButtonDetailsSubscription.click();

    // Click on pause button
    await expect(this.actionablesButtonPauseSubscription).toBeVisible();
    await this.actionablesButtonPauseSubscription.click();
  }

  async clickSubscriptionActionableReactivate(): Promise<void> {
    // Click on actionables button to expand options
    await this.actionablesButtonDetailsSubscription.click();

    // Click on reactivate button
    await expect(this.actionablesButtonReactivateSubscription).toBeVisible();
    await this.actionablesButtonReactivateSubscription.click();
  }

  async clickSubscriptionActionableCancel(): Promise<void> {
    // Click on actionables button to expand options
    await this.actionablesButtonDetailsSubscription.click();

    const cancelButton = this.page.getByTestId('subscription-detail-button-cancel');

    await expect(cancelButton).toBeVisible();
    await cancelButton.click();
  }
}
