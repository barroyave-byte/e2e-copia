import { expect, Locator, Page } from '@playwright/test';
import { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import { CommonsActions } from '@pages/commonActions';
import { AdminDatePicker } from '@pages/admin/components/atoms/adminDatePicker';
import { MetricsType } from './types';
import { DATA_TEST_IDS } from './constants';

export class AdminMetricsPage extends CommonsActions {
  readonly page: Page;
  readonly buttonClearFilters: Locator;
  readonly buttonApplyDatePicker: Locator;
  readonly datePickerPopover: Locator;
  readonly selectedDatePickerDays: Locator;
  readonly buttonSalesMetrics: Locator;
  readonly buttonAcceptanceRateMetrics: Locator;
  readonly buttonPaymentStrategyMetrics: Locator;
  readonly buttonReconciliationMetrics: Locator;
  readonly inputMetricsPeriodFilter: Locator;
  readonly dateRangePicker: Locator;
  readonly inputMetricsTemporalityFilter: Locator;
  readonly iframeGmvOrdersMetrics: Locator;
  readonly iframeAovMetrics: Locator;
  readonly iframePaymentStatusMetrics: Locator;
  readonly iframeFranchiseMetrics: Locator;
  readonly iframeTopBinMetrics: Locator;
  readonly iframeTopBanksMetrics: Locator;
  readonly iframeReconciliationsRadialBarMetrics: Locator;
  readonly iframeReconciliationSubStatusMetrics: Locator;
  readonly iframeTransactionTypeMetrics: Locator;
  readonly iframeReconciliationHeatmapMetrics: Locator;
  readonly iframeReconciliationAndTransactionsMetrics: Locator;
  readonly iframeReconciliationPerProcessorMetrics: Locator;
  readonly selectors: AdminTranslations;
  private readonly adminDatePicker: AdminDatePicker;
  private buttonMap: Record<MetricsType, Locator>;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.adminDatePicker = new AdminDatePicker(page);
    this.selectors = getTranslations('admin', languageCode);
    this.buttonClearFilters = page.getByTestId(DATA_TEST_IDS.CLEAR_FILTERS_BUTTON);
    this.buttonApplyDatePicker = page.getByTestId(DATA_TEST_IDS.SELECT_PERIOD_BUTTON_APPLY);
    this.datePickerPopover = page.getByTestId(
      DATA_TEST_IDS.SELECT_PERIOD_CONTAINER_FLOATING_CONTENT
    );
    this.selectedDatePickerDays = this.datePickerPopover
      .getByRole('gridcell', { selected: true })
      .filter({ has: page.locator('button[data-testid]') });
    this.buttonSalesMetrics = page.getByTestId(DATA_TEST_IDS.FILTER_TAB_SALES);
    this.buttonAcceptanceRateMetrics = page.getByTestId(DATA_TEST_IDS.FILTER_TAB_ACCEPTANCE_RATE);
    this.buttonPaymentStrategyMetrics = page.getByTestId(
      DATA_TEST_IDS.FILTER_TAB_PAYMENT_STRATEGIES
    );
    this.buttonReconciliationMetrics = page.getByTestId(DATA_TEST_IDS.FILTER_TAB_RECONCILIATIONS);
    this.inputMetricsPeriodFilter = page.getByTestId(DATA_TEST_IDS.SELECT_PERIOD_INPUT_DATE_RANGE);
    this.inputMetricsTemporalityFilter = page.getByTestId(
      DATA_TEST_IDS.SELECT_PERIOD_INPUT_TEMPORALITY
    );
    this.dateRangePicker = page.getByTestId(DATA_TEST_IDS.SELECT_PERIOD_INPUT_DATE_RANGE);
    this.iframeGmvOrdersMetrics = page.getByTestId(DATA_TEST_IDS.GMV_ORDERS_METRICS_IFRAME);
    this.iframeAovMetrics = page.getByTestId(DATA_TEST_IDS.AOV_METRICS_IFRAME);
    this.iframePaymentStatusMetrics = page.getByTestId(DATA_TEST_IDS.PAYMENT_STATUS_METRICS_IFRAME);
    this.iframeFranchiseMetrics = page.getByTestId(DATA_TEST_IDS.FRANCHISE_METRICS_IFRAME);
    this.iframeTopBinMetrics = page.getByTestId(DATA_TEST_IDS.TOP_BINS_METRICS_IFRAME);
    this.iframeTopBanksMetrics = page.getByTestId(DATA_TEST_IDS.TOP_BANKS_METRICS_IFRAME);
    this.iframeReconciliationsRadialBarMetrics = page
      .getByTestId(DATA_TEST_IDS.RECONCILIATIONS_RADIAL_BAR_METRICS_IFRAME)
      .and(page.locator('iframe'));
    this.iframeReconciliationSubStatusMetrics = page
      .getByTestId(DATA_TEST_IDS.RECONCILIATION_SUB_STATUS_METRICS_IFRAME)
      .and(page.locator('iframe'));
    this.iframeTransactionTypeMetrics = page
      .getByTestId(DATA_TEST_IDS.TRANSACTION_TYPE_METRICS_IFRAME)
      .and(page.locator('iframe'));
    this.iframeReconciliationHeatmapMetrics = page
      .getByTestId(DATA_TEST_IDS.RECONCILIATION_HEATMAP_METRICS_IFRAME)
      .and(page.locator('iframe'));
    this.iframeReconciliationAndTransactionsMetrics = page
      .getByTestId(DATA_TEST_IDS.RECONCILIATION_AND_TRANSACTIONS_METRICS_IFRAME)
      .and(page.locator('iframe'));
    this.iframeReconciliationPerProcessorMetrics = page
      .getByTestId(DATA_TEST_IDS.RECONCILIATION_PER_PROCESSOR_METRICS_IFRAME)
      .and(page.locator('iframe'));

    // Initialize metrics buttons map
    this.buttonMap = {
      sales: this.buttonSalesMetrics,
      acceptanceRate: this.buttonAcceptanceRateMetrics,
      paymentStrategy: this.buttonPaymentStrategyMetrics,
      reconciliation: this.buttonReconciliationMetrics,
    };
  }

  //Assertions:
  async assertMetricsPageAsCurrentPage() {
    const currentUrl = this.page.url();
    const url = new URL(currentUrl);
    expect(url.pathname).toBe('/metrics');
  }

  //Actions
  async selectsAPeriodFilter(): Promise<string> {
    await this.inputMetricsPeriodFilter.click();
    await expect(this.datePickerPopover).toBeVisible();

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const year = today.getFullYear();
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const todayButton = this.adminDatePicker.getButtonByDate(today, this.datePickerPopover);
    let isVisible = await todayButton.isVisible();

    if (!isVisible) {
      const nextMonthButton = this.page.getByTestId(DATA_TEST_IDS.SELECT_PERIOD_BUTTON_NEXT_MONTH);
      const maxAttempts = 3;

      for (let i = 0; i < maxAttempts && !isVisible; i++) {
        await nextMonthButton.click();
        isVisible = await todayButton.isVisible();
      }
    }

    await expect(todayButton).toBeVisible();

    await todayButton.click();

    await expect(this.buttonApplyDatePicker).toBeEnabled();
    await this.buttonApplyDatePicker.scrollIntoViewIfNeeded();
    try {
      await this.buttonApplyDatePicker.click({ force: true, timeout: 5000 });
    } catch {
      await this.buttonApplyDatePicker.dispatchEvent('click');
    }

    return formattedDate;
  }

  //Assertions

  async assertPrincipalMetrics() {
    await expect(this.inputMetricsPeriodFilter).toBeVisible();
    await expect(this.inputMetricsTemporalityFilter).toBeVisible();
    await expect(this.buttonClearFilters).toBeVisible();
    await expect(this.iframeGmvOrdersMetrics).toBeAttached();
    await expect(this.iframeAovMetrics).toBeAttached();
    await expect(this.iframePaymentStatusMetrics).toBeAttached();
    await expect(this.iframeFranchiseMetrics).toBeAttached();
    await expect(this.iframeTopBinMetrics).toBeAttached();
    await expect(this.iframeTopBanksMetrics).toBeAttached();
  }

  async assertSingleDayPeriodIsApplied(selectedDate: string) {
    const datePickerActionTimeout = 40_000;
    await expect(
      this.datePickerPopover,
      'The date picker should close after applying the period'
    ).toBeHidden();
    // Reopen the picker to verify the committed range, independently of chart data.
    await this.inputMetricsPeriodFilter.click({ timeout: datePickerActionTimeout });
    await expect(
      this.datePickerPopover,
      'The date picker should reopen to verify the applied period'
    ).toBeVisible();
    await expect(
      this.selectedDatePickerDays,
      `The applied period should contain exactly one selected day: ${selectedDate}`
    ).toHaveCount(1);
    const [year, month, day] = selectedDate.split('-').map(Number);
    await expect(
      this.adminDatePicker.getButtonByDate(
        new Date(year, month - 1, day),
        this.selectedDatePickerDays
      ),
      `The selected day should match the applied date ${selectedDate}`
    ).toBeVisible();
    await this.datePickerPopover.press('Escape', { timeout: datePickerActionTimeout });
    await expect(
      this.datePickerPopover,
      'The date picker should close after pressing Escape'
    ).toBeHidden();
  }

  async assertGmvOrdersMetricsHasValidURL() {
    await expect(this.iframeGmvOrdersMetrics).toHaveAttribute('src', /merchantId/, {
      timeout: 3000,
    });
  }

  async assertGmvOrdersMetricsHasProperDateRange(selectedDate: string) {
    const dateRange = `dateFrom=${selectedDate}&dateTo=${selectedDate}`;
    await expect(this.iframeGmvOrdersMetrics).toHaveAttribute('src', new RegExp(dateRange), {
      timeout: 1000,
    });
  }

  async selectMetricsTab(metricsType: MetricsType) {
    const selectedButton = this.buttonMap[metricsType];
    await this.ensureVisibleToClick(selectedButton);
  }

  async assertMetricsTabIsSelected(metricsType: MetricsType) {
    await expect(this.buttonMap[metricsType]).toHaveAttribute('aria-selected', 'true');
  }

  async assertReconciliationIframesAreAttached() {
    // QA merchants may have no metrics data or token, leaving the frames hidden/about:blank.
    const iframes = [
      this.iframeReconciliationsRadialBarMetrics,
      this.iframeReconciliationSubStatusMetrics,
      this.iframeTransactionTypeMetrics,
      this.iframeReconciliationHeatmapMetrics,
      this.iframeReconciliationAndTransactionsMetrics,
      this.iframeReconciliationPerProcessorMetrics,
    ];
    for (const iframe of iframes) {
      await expect(iframe).toBeAttached();
    }
  }

  private validateSuccessfulStatusCode(status: number, urlPattern: string) {
    expect(
      status,
      `URL ${urlPattern} should return success status (got ${status})`
    ).toBeGreaterThanOrEqual(200);
    expect(status, `URL ${urlPattern} should return success status (got ${status})`).toBeLessThan(
      300
    );
  }

  async waitForSuccessfulResponse(urlPattern: string) {
    const response = await this.page.waitForResponse((response) => {
      const matchesUrl = new RegExp(urlPattern).test(response.url());
      const hasSuccessStatus = response.status() >= 200 && response.status() <= 299;
      return matchesUrl && hasSuccessStatus;
    });

    this.validateSuccessfulStatusCode(response.status(), urlPattern);

    return response;
  }
}
