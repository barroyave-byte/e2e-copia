import { CommonsActions } from '@pages/commonActions';
import { expect, Page, Locator } from '@playwright/test';
import envConfig from '@support/envConfig';
import { GET_FIELDS_PATH, GET_FILTERS_PATH, type ScheduleReportType } from './constants/commons';
import { retryOperationReloadWithAction, retryUntil } from '@support/utils/retries';

const urlReports = `${envConfig.ADMIN_URL}/reports/downloads`;

export class AdminReportsPage extends CommonsActions {
  readonly page: Page;
  readonly buttonSelectPagination: Locator;
  readonly buttonGoToReports: Locator;
  readonly buttonScheduleReportsType: Locator;
  readonly buttonScheduledTab: Locator;
  readonly reportsTitle: Locator;
  readonly tableRows: Locator;
  readonly adhocReportDetailOrigin: Locator;
  readonly adhocReportDetailType: Locator;
  readonly adhocReportFilters: Locator;
  readonly adhocReportColumns: Locator;
  readonly adhocReportColumnBadgeTotals: Locator;
  readonly buttonReportActions: (fileId: string) => Locator;
  readonly buttonDownloadFile: (fileId: string) => Locator;
  readonly buttonScheduleReportTypeTrigger: Locator;
  readonly optionScheduleReportType: (reportType: ScheduleReportType) => Locator;

  private interceptedFile: any;
  private presignedUrlCount = 0;
  private downloadUrlPromise: any;

  constructor(page: Page) {
    super(page);

    this.page = page;
    this.buttonSelectPagination = page.getByTestId(
      'reports-downloads-table-paginator-select-page-size'
    );
    this.tableRows = page.locator('table tbody tr');
    this.buttonGoToReports = page.getByTestId('orders-dialog-file-processing-confirm-button');
    this.buttonScheduleReportsType = page.getByTestId('reports-button-schedule');
    this.buttonScheduledTab = page.getByTestId('reports-filter-tab-scheduled');
    this.reportsTitle = page.getByTestId('reports-title');
    this.adhocReportDetailOrigin = page.getByTestId('adhoc-report-detail-origin');
    this.adhocReportDetailType = page.getByTestId('adhoc-report-detail-type');
    this.adhocReportFilters = page.getByTestId('adhoc-report-filters');
    this.adhocReportColumns = page.getByTestId('adhoc-report-columns');
    this.adhocReportColumnBadgeTotals = this.adhocReportColumns.locator(
      '[data-testid^="adhoc-report-columns-badge-total-"]'
    );
    this.buttonReportActions = (fileId: string) =>
      page.getByTestId(`reports-downloads-table-row-${fileId}-button-actions`);
    this.buttonDownloadFile = (fileId: string) =>
      page.getByTestId(`reports-action-download-${fileId}`);
    this.buttonScheduleReportTypeTrigger = page.getByTestId(
      'schedule-report-report-type-combobox-container-trigger'
    );
    this.optionScheduleReportType = (reportType: ScheduleReportType) =>
      page.getByTestId(`schedule-report-report-type-option-${reportType}`);
  }

  // Report generation can take a minute or more, so this polls the files list
  // until a matching file with status SUCCESS and version v2 shows up, instead of
  // checking only once. Every attempt reloads and re-selects `pageSize` itself
  // (rather than relying on a selection made before calling this method) —
  // re-selecting a page size that's already active is a no-op that fires no
  // request, so if `pageSize` happens to match the grid's default, a prior
  // selection alone would never produce a response to catch.
  async waitForAvailableReportFile(
    pageSize: string = '100',
    fileName?: string,
    maxRetries: number = 6,
    retryDelay: number = 30000
  ): Promise<void> {
    const perAttemptTimeout = 20000;
    const expectedName = fileName ? `${fileName.replace(/[-:.]/g, '_')}.csv.gz` : undefined;

    const fetchAvailableFile = async (): Promise<any> => {
      try {
        // Reload before arming the listener: a files response from the previous document can
        // land between the reload and its load, and the reload drops its body, so res.json()
        // would hang with no timeout until the test times out (ADM-T531).
        await this.page.reload();

        const responsePromise = this.page.waitForResponse(
          (response) =>
            response.url().includes('/files') &&
            response.url().includes(`page_size=${pageSize}`) &&
            response.request().method() === 'GET',
          { timeout: perAttemptTimeout }
        );

        await this.selectPaginationOption(pageSize);

        const res = await responsePromise;
        const data = await res.json();
        if (!Array.isArray(data?.files)) {
          // Without this the attempt died on a TypeError, reported as a request that did not resolve.
          console.log(
            `[INFO] waitForAvailableReportFile --> HTTP ${res.status()} without a files list (keys: ${Object.keys(data ?? {}).join(', ') || 'none'}).`
          );
          return undefined;
        }
        const candidates = data.files.filter((file) => !expectedName || file.name === expectedName);
        const available = candidates.find(
          (file) => file.status === 'SUCCESS' && file.version === 'v2'
        );
        if (!available) {
          // Whether the report is still pending or failed is what tells a slow report job apart
          // from a broken one: ADM-T531 polled 3 minutes without knowing which.
          console.log(
            `[INFO] waitForAvailableReportFile --> not available yet: ${JSON.stringify(
              candidates.slice(0, 3).map(({ status, version }) => ({ status, version }))
            )}`
          );
        }
        return available;
      } catch (error) {
        console.log(
          `[INFO] waitForAvailableReportFile --> request for the files list failed (${error instanceof Error ? error.message : error}).`
        );
        return undefined;
      }
    };

    const availableFile = await retryUntil(
      fetchAvailableFile,
      (file) => Boolean(file),
      maxRetries,
      retryDelay
    );

    if (!availableFile) {
      throw new Error(
        `No report with status SUCCESS and version v2 became available after ${maxRetries} attempts`
      );
    }

    this.interceptedFile = availableFile;
  }

  async countDownloadRequests() {
    // Awaited: the route only counts once page.route() has resolved, and the spec awaits
    // this method precisely to know the interception is in place before downloading.
    await this.page.context().route('**/download', (route) => {
      this.presignedUrlCount++;
      route.continue();
    });
  }

  async waitForDownloadResponse() {
    this.downloadUrlPromise = this.page.waitForResponse(
      (res) => res.url().includes('/download') && res.request().method() === 'GET',
      { timeout: 60000 }
    );
  }

  async clickToOpenScheduleReportTypes() {
    await this.ensureVisibleToClick(this.buttonScheduleReportsType);
  }

  async goToScheduleReportCreationForm(reportType: ScheduleReportType) {
    await this.ensureVisibleToClick(
      this.buttonScheduleReportTypeTrigger,
      undefined,
      'The schedule report type selector is not visible',
      { timeout: 40_000 }
    );

    const catalogResponses =
      reportType === 'reconciliations'
        ? Promise.all([
            this.waitForPostResponse(GET_FIELDS_PATH, 200),
            this.waitForPostResponse(GET_FILTERS_PATH, 200),
          ])
        : undefined;

    await this.ensureVisibleToClick(
      this.optionScheduleReportType(reportType),
      undefined,
      `The ${reportType} schedule report type option is not visible`,
      { timeout: 40_000 }
    );

    await catalogResponses;
  }

  async getFile() {
    if (!this.interceptedFile) {
      throw new Error('No se ha interceptado ningún archivo todavía');
    }
    return this.interceptedFile;
  }

  async selectPaginationOption(option: string): Promise<void> {
    await expect(this.buttonSelectPagination).toBeVisible();
    await this.buttonSelectPagination.scrollIntoViewIfNeeded();

    const tagName = await this.buttonSelectPagination.evaluate((el) => el.tagName);
    if (tagName === 'SELECT') {
      await this.buttonSelectPagination.selectOption(option);
      return;
    }

    const optionFound = this.page.getByTestId(
      `reports-downloads-table-paginator-option-page-size-${option}`
    );

    /*
     * The paginator (Radix Select) may remount after a previous page size change, causing the first click to be lost. Retry until the dropdown actually opens.
     */
    await expect(async () => {
      // Ensure dropdown is closed before trying to open it (avoids stale open state).
      const state = await this.buttonSelectPagination.getAttribute('data-state');
      if (state === 'open') {
        await this.page.keyboard.press('Escape');
      }
      await this.buttonSelectPagination.click();
      await expect(this.buttonSelectPagination).toHaveAttribute('data-state', 'open', {
        timeout: 1500,
      });
      await expect(optionFound).toBeVisible({ timeout: 1500 });
      await optionFound.click({ force: true });
      await expect(this.buttonSelectPagination).toContainText(option, { timeout: 2000 });
    }).toPass();
  }

  async downloadReport(fileId: string) {
    await this.ensureVisibleToClick(
      this.buttonReportActions(fileId),
      undefined,
      `The actions button for report ${fileId} is not visible`,
      { timeout: 40_000 }
    );
    await this.ensureVisibleToClick(
      this.buttonDownloadFile(fileId),
      undefined,
      `The download option for report ${fileId} is not visible`,
      { timeout: 40_000 }
    );
  }

  async assertDownloadUrlCalledTimes(expectedCount: number) {
    expect(this.presignedUrlCount).toBe(expectedCount);
  }

  async assertDownloadUrlStatusIs200() {
    const response = await this.downloadUrlPromise;
    expect(response.status(), 'PresignedUrl Response').toBe(200);
  }

  async clickScheduledTab(): Promise<void> {
    await expect(this.buttonScheduledTab).toBeVisible();
    await this.buttonScheduledTab.click();
  }

  async clickGoToReports(): Promise<void> {
    await this.ensureVisibleToClick(this.buttonGoToReports);
  }

  async assertReportsTitleVisible(): Promise<void> {
    await this.page.waitForURL(urlReports);
    await expect(this.reportsTitle).toBeVisible();
  }

  async openReportDetails(fileName: string): Promise<void> {
    const reportRow = this.tableRows.filter({ hasText: `${fileName}.csv.gz` }).first();
    await this.ensureVisibleToClick(
      reportRow,
      undefined,
      `Report row for ${fileName}.csv.gz is not visible`,
      { timeout: 40_000 }
    );
  }

  async assertSelectedColumnsCountAtLeast(minimum: number): Promise<void> {
    const totals = await this.adhocReportColumnBadgeTotals.allTextContents();

    expect(totals.reduce((sum, total) => sum + Number(total), 0)).toBeGreaterThanOrEqual(minimum);
  }

  async assertReportInTable(fileName: string): Promise<void> {
    const sanitized = fileName.replace(/[-:.]/g, '_');
    const expectedName = `${sanitized}.csv.gz`;
    const cell = this.page
      .locator('[data-testid^="reports-downloads-table-cell-name-"]')
      .filter({ hasText: expectedName });
    await retryOperationReloadWithAction(this.page, cell, 5, 5000, async () => {});
  }

  async assertPresenceInReports() {
    await this.page.waitForURL(urlReports);
    expect(this.page.url()).toBe(`${urlReports}`);
  }

  async assertPresenceInScheduledReports() {
    const scheduledReportsUrl = /\/reports\/scheduled(?:\?|$)/;
    await this.page.waitForURL(scheduledReportsUrl, { timeout: 40000 });
    await expect(this.page, 'The scheduled reports page is not visible').toHaveURL(
      scheduledReportsUrl,
      { timeout: 40000 }
    );
  }

  async assertTableHaveAtLeastOneRow() {
    await expect(this.tableRows.first()).toBeVisible({ timeout: 5000 });
  }

  async assertModalGoToReportIsVisible(): Promise<void> {
    await expect(this.buttonGoToReports).toBeVisible();
  }
}
