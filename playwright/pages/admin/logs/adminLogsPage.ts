import { CommonsActions } from '@pages/commonActions';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { expect, Locator, Page, Response } from '@playwright/test';
import envConfig from '@support/envConfig';
import { retryUntil } from '@support/utils/retries';
import {
  CALENDAR_TEST_IDS,
  LOGS_DATA_TEST_IDS,
  LOGS_EXPORT_DOWNLOADABLE_STATUS,
  LOGS_RECORDS_COLUMNS,
} from './constants';

const VISIBILITY_TIMEOUT = 40000;
const DOWNLOADS_RESPONSE_TIMEOUT = 60000;
const ADVANCED_FILTERS = ['section', 'action', 'severity', 'result'] as const;
const RECORD_FILTER_QUERY_KEYS = [
  'start_date',
  'end_date',
  'email',
  'name',
  'event',
  'category',
  'severity',
  'result',
] as const;

type AdvancedFilter = (typeof ADVANCED_FILTERS)[number];
type AuditLogRecord = {
  timestamp?: string;
  actor_email?: string;
  actor_name?: string;
  event_name?: string;
  event_category?: string;
  event_severity?: string;
  event_result?: string;
};
type AuditLogExportsPage = {
  pagination?: {
    next_cursor?: unknown;
  };
};

/** Calendar day test ids are built from `yyyy-MM-dd` (react-day-picker isoDate). */
export function toIsoDay(date: Date): string {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index ? 2 : 4, '0'))
    .join('-');
}

/** Returns the ISO day `daysAgo` days before today. */
export function isoDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return toIsoDay(date);
}

function shiftIsoDay(isoDay: string, days: number): string {
  const [year, month, day] = isoDay.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export class AdminLogsPage extends CommonsActions {
  protected page: Page;

  readonly sidebarMenuLogs: Locator;
  readonly recordsTitle: Locator;
  readonly searchInput: Locator;
  readonly dateFilter: Locator;
  readonly tableRows: Locator;
  readonly tableRefreshButton: Locator;
  readonly paginatorSelectPageSize: Locator;
  readonly paginatorInfoPage: Locator;
  private readonly tableHeader: (column: string) => Locator;
  private readonly tableTotalCount: Locator;
  private readonly calendarDialog: (scope: string) => Locator;
  private readonly calendarDay: (scope: string, isoDay: string) => Locator;
  private readonly calendarNavigationButton: (scope: string, isoDay: string) => Locator;
  private readonly calendarCancelButton: (scope: string) => Locator;
  private readonly calendarConfirmButton: (scope: string) => Locator;
  private readonly exportButton: Locator;
  private readonly exportSubmitButton: Locator;
  private readonly exportDateRangeTrigger: Locator;
  private readonly exportSectionFilterTrigger: Locator;
  private readonly exportSectionOption: (section: string) => Locator;
  private readonly exportSuccessToast: Locator;
  private readonly exportErrorToast: Locator;
  private readonly recordsTab: Locator;
  private readonly downloadsTab: Locator;
  private readonly notFoundState: Locator;
  private readonly moreFiltersButton: Locator;
  private readonly moreFiltersOption: (filter: AdvancedFilter) => Locator;
  private readonly moreFiltersApplyButton: Locator;
  private readonly moreFiltersClearButton: Locator;
  private readonly sectionFilterTrigger: Locator;
  private readonly sectionFilterOption: (section: string) => Locator;
  private readonly actionFilterTrigger: Locator;
  private readonly actionFilterOption: (action: string) => Locator;
  private readonly severityFilterTrigger: Locator;
  private readonly severityFilterOption: (severity: string) => Locator;
  private readonly resultFilterTrigger: Locator;
  private readonly resultFilterOption: (result: string) => Locator;
  private readonly recordSectionCell: (rowId: string) => Locator;
  private readonly clearFiltersButton: Locator;
  private readonly recordToggleButton: (rowId: string) => Locator;
  private readonly rowDetails: (rowId: string) => Locator;
  private readonly detailTabDetails: Locator;
  private readonly detailsTable: Locator;
  private readonly detailsTableFirstRow: Locator;
  private readonly detailTabJson: Locator;
  private readonly jsonContent: Locator;
  private readonly jsonSearchInput: Locator;
  private readonly recordIpCell: (rowId: string) => Locator;
  private readonly recordActionsButton: (rowId: string) => Locator;
  private readonly recordCopyEntry: (rowId: string) => Locator;
  private readonly recordCopyIp: (rowId: string) => Locator;
  private readonly downloadsRows: Locator;
  private readonly downloadsRow: (exportId: string) => Locator;
  private readonly downloadsNameCell: (exportId: string) => Locator;
  private readonly downloadsCreatedAtCell: (exportId: string) => Locator;
  private readonly downloadsStatusChip: (exportId: string) => Locator;
  private readonly copyExportNameButton: (exportId: string) => Locator;
  private readonly downloadsPaginatorNext: Locator;
  private readonly downloadsPaginatorPrevious: Locator;
  private readonly exportCancelButton: Locator;
  private readonly exportStatusChip: (exportId: string, status: string) => Locator;
  private readonly exportDownloadButton: (exportId: string) => Locator;
  private readonly downloadsRefreshButton: Locator;
  private readonly expiredDownloadRow: Locator;
  private readonly downloadErrorToast: Locator;
  private lastAppliedRecordRange?: { start: number; end: number };
  private downloadsNextCursor?: string;

  constructor(page: Page) {
    super(page);
    this.page = page;

    this.sidebarMenuLogs = new AdminHomePage(page).buttonLogs;
    this.recordsTitle = page.getByTestId(LOGS_DATA_TEST_IDS.title);
    this.searchInput = page.getByTestId(LOGS_DATA_TEST_IDS.searchInput);
    this.dateFilter = page.getByTestId(LOGS_DATA_TEST_IDS.dateFilter);
    this.tableRows = page.locator(`tr[data-testid^="${LOGS_DATA_TEST_IDS.tableRowPrefix}"]`);
    this.tableRefreshButton = page.getByTestId(LOGS_DATA_TEST_IDS.tableRefreshButton);
    this.paginatorSelectPageSize = page.getByTestId(
      LOGS_DATA_TEST_IDS.tablePaginatorSelectPageSize
    );
    this.paginatorInfoPage = page.getByTestId(LOGS_DATA_TEST_IDS.tablePaginatorInfoPage);
    this.tableHeader = (column) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.tableHeaderPrefix}${column}`);
    this.tableTotalCount = page.getByTestId(LOGS_DATA_TEST_IDS.tableTotalCount);
    this.calendarDialog = (scope) => page.getByTestId(CALENDAR_TEST_IDS.dialog(scope));
    this.calendarDay = (scope, isoDay) => page.getByTestId(CALENDAR_TEST_IDS.day(scope, isoDay));
    this.calendarNavigationButton = (scope, isoDay) =>
      page.getByTestId(
        isoDay > toIsoDay(new Date())
          ? CALENDAR_TEST_IDS.nextMonthButton(scope)
          : CALENDAR_TEST_IDS.prevMonthButton(scope)
      );
    this.calendarCancelButton = (scope) => page.getByTestId(CALENDAR_TEST_IDS.cancelButton(scope));
    this.calendarConfirmButton = (scope) =>
      page.getByTestId(CALENDAR_TEST_IDS.confirmButton(scope));
    this.exportButton = page.getByTestId(LOGS_DATA_TEST_IDS.exportButton);
    this.exportSubmitButton = page.getByTestId(LOGS_DATA_TEST_IDS.exportSubmitButton);
    this.exportDateRangeTrigger = page.getByTestId(LOGS_DATA_TEST_IDS.exportDateRangeScope);
    this.exportSectionFilterTrigger = page.getByTestId(
      LOGS_DATA_TEST_IDS.exportSectionFilterTrigger
    );
    this.exportSectionOption = (section) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.exportSectionOptionPrefix}${section}`);
    this.exportSuccessToast = page.getByTestId(LOGS_DATA_TEST_IDS.exportSuccessToast).first();
    this.exportErrorToast = page.getByTestId(LOGS_DATA_TEST_IDS.exportErrorToast).first();
    this.recordsTab = page.getByTestId(LOGS_DATA_TEST_IDS.tabRecords);
    this.downloadsTab = page.getByTestId(LOGS_DATA_TEST_IDS.tabDownloads);
    this.notFoundState = page.getByTestId(LOGS_DATA_TEST_IDS.notFoundState);
    this.moreFiltersButton = page.getByTestId(LOGS_DATA_TEST_IDS.moreFiltersButton);
    this.moreFiltersOption = (filter) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.moreFiltersOptionPrefix}${filter}`);
    this.moreFiltersApplyButton = page.getByTestId(LOGS_DATA_TEST_IDS.moreFiltersApplyButton);
    this.moreFiltersClearButton = page.getByTestId(LOGS_DATA_TEST_IDS.moreFiltersClearButton);
    this.sectionFilterTrigger = page.getByTestId(
      `${LOGS_DATA_TEST_IDS.sectionFilterScope}-combobox-container-trigger`
    );
    this.sectionFilterOption = (section) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.sectionFilterOptionPrefix}${section}`);
    this.actionFilterTrigger = page.getByTestId(
      `${LOGS_DATA_TEST_IDS.actionFilterScope}-combobox-container-trigger`
    );
    this.actionFilterOption = (action) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.actionFilterOptionPrefix}${action}`);
    this.severityFilterTrigger = page.getByTestId(
      `${LOGS_DATA_TEST_IDS.severityFilterScope}-combobox-container-trigger`
    );
    this.severityFilterOption = (severity) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.severityFilterOptionPrefix}${severity}`);
    this.resultFilterTrigger = page.getByTestId(
      `${LOGS_DATA_TEST_IDS.resultFilterScope}-combobox-container-trigger`
    );
    this.resultFilterOption = (result) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.resultFilterOptionPrefix}${result}`);
    this.recordSectionCell = (rowId) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.tableCellSectionPrefix}${rowId}`);
    this.clearFiltersButton = page.getByTestId(LOGS_DATA_TEST_IDS.clearFiltersButton);
    this.recordToggleButton = (rowId) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.tableToggleRowButtonPrefix}${rowId}`);
    this.rowDetails = (rowId) => page.getByTestId(`${LOGS_DATA_TEST_IDS.rowDetailsPrefix}${rowId}`);
    this.detailTabDetails = page.getByTestId(LOGS_DATA_TEST_IDS.detailTabDetails);
    this.detailsTable = page.getByTestId(LOGS_DATA_TEST_IDS.detailsTable);
    this.detailsTableFirstRow = this.detailsTable.getByRole('row').nth(1);
    this.detailTabJson = page.getByTestId(LOGS_DATA_TEST_IDS.detailTabJson);
    this.jsonContent = page.getByTestId(LOGS_DATA_TEST_IDS.jsonCodeContent);
    this.jsonSearchInput = page.getByTestId(LOGS_DATA_TEST_IDS.jsonSearchInput);
    this.recordIpCell = (rowId) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.tableCellIpPrefix}${rowId}`);
    this.recordActionsButton = (rowId) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.tableActionsButtonPrefix}${rowId}`);
    this.recordCopyEntry = (rowId) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.tableCopyEntryPrefix}${rowId}`);
    this.recordCopyIp = (rowId) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.tableCopyIpPrefix}${rowId}`);
    this.downloadsRows = page.getByTestId(
      new RegExp(`^${LOGS_DATA_TEST_IDS.downloadsTableRowPrefix}`)
    );
    this.downloadsRow = (exportId) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.downloadsTableRowPrefix}${exportId}`);
    this.downloadsNameCell = (exportId) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.downloadsTableCellNamePrefix}${exportId}`);
    this.downloadsCreatedAtCell = (exportId) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.downloadsTableCellCreatedAtPrefix}${exportId}`);
    this.downloadsStatusChip = (exportId) =>
      page.locator(
        `[data-testid="${LOGS_DATA_TEST_IDS.downloadsTableRowPrefix}${exportId}"] [data-testid^="${LOGS_DATA_TEST_IDS.downloadsTableChipPrefix}"]`
      );
    this.copyExportNameButton = (exportId) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.copyExportNameButtonPrefix}${exportId}`);
    this.downloadsPaginatorNext = page.getByTestId(LOGS_DATA_TEST_IDS.downloadsPaginatorNext);
    this.downloadsPaginatorPrevious = page.getByTestId(
      LOGS_DATA_TEST_IDS.downloadsPaginatorPrevious
    );
    this.exportCancelButton = page.getByTestId(LOGS_DATA_TEST_IDS.exportCancelButton);
    this.exportStatusChip = (exportId, status) =>
      page.locator(
        `[data-testid="${LOGS_DATA_TEST_IDS.downloadsTableRowPrefix}${exportId}"] [data-testid="${LOGS_DATA_TEST_IDS.downloadsTableChipPrefix}${status}"]`
      );
    this.exportDownloadButton = (exportId) =>
      page.getByTestId(`${LOGS_DATA_TEST_IDS.downloadExportButtonPrefix}${exportId}`);
    this.downloadsRefreshButton = page.getByTestId(LOGS_DATA_TEST_IDS.downloadsTableRefreshButton);
    this.expiredDownloadRow = this.downloadsRows
      .filter({
        has: page.getByTestId(`${LOGS_DATA_TEST_IDS.downloadsTableChipPrefix}expired`),
      })
      .first();
    this.downloadErrorToast = page.getByTestId(LOGS_DATA_TEST_IDS.downloadErrorToast);
  }

  private waitForRecordsResponse(matches: (url: URL) => boolean = () => true): Promise<Response> {
    return this.page.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return (
          response.request().method() === 'GET' &&
          url.pathname.includes('/merchants/audit-logs') &&
          !url.pathname.includes('/exports') &&
          !url.pathname.includes('/filters') &&
          matches(url)
        );
      },
      { timeout: VISIBILITY_TIMEOUT }
    );
  }

  private async recordsFrom(response: Response, operation: string): Promise<AuditLogRecord[]> {
    expect(response.ok(), `${operation} failed with status ${response.status()}`).toBe(true);
    const body: unknown = await response.json();
    expect(body, `${operation} returned an empty response body`).toBeTruthy();
    const data = (body as { data?: unknown }).data;
    expect(Array.isArray(data), `${operation} did not return a data array`).toBe(true);
    return data as AuditLogRecord[];
  }

  private waitForDownloadsResponse(matches: (url: URL) => boolean = () => true): Promise<Response> {
    return this.page.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return (
          response.request().method() === 'GET' &&
          url.pathname.endsWith('/merchants/audit-logs/exports') &&
          matches(url)
        );
      },
      { timeout: DOWNLOADS_RESPONSE_TIMEOUT }
    );
  }

  private async rememberDownloadsCursor(response: Response): Promise<void> {
    expect(response.ok(), `Loading Downloads failed with status ${response.status()}`).toBe(true);
    const body: unknown = await response.json();
    expect(body, 'The Downloads response body is empty').toBeTruthy();
    const pagination = (body as AuditLogExportsPage).pagination;
    expect(pagination, 'The Downloads response has no pagination object').toBeTruthy();
    this.downloadsNextCursor =
      typeof pagination?.next_cursor === 'string' ? pagination.next_cursor : undefined;
  }

  private async firstRecordId(): Promise<string> {
    const firstRow = this.tableRows.first();
    await expect(firstRow, 'The records table did not render a row').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    const rowId = (await firstRow.getAttribute('data-testid'))?.replace(
      LOGS_DATA_TEST_IDS.tableRowPrefix,
      ''
    );
    expect(rowId, 'The first audit-log row has no id').toBeTruthy();
    return rowId as string;
  }

  async goToLogsRecords(): Promise<void> {
    await expect(this.sidebarMenuLogs, 'The Logs sidebar menu item is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.sidebarMenuLogs.click();
    await this.page.waitForURL('**/logs/records', { timeout: VISIBILITY_TIMEOUT });
  }

  async assertRecordsColumnsVisible(): Promise<void> {
    for (const column of LOGS_RECORDS_COLUMNS) {
      await expect(
        this.tableHeader(column),
        `The records table header for column "${column}" is not visible`
      ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    }
  }

  /** Waits for the current records query to render at least the requested row count. */
  async assertRecordsTableHasRows(minRows = 1): Promise<void> {
    await expect(
      this.tableRows.first(),
      'The audit logs records table did not render any row'
    ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    const rowCount = await this.tableRows.count();
    expect(
      rowCount,
      `Expected at least ${minRows} audit log rows, but the table has ${rowCount}`
    ).toBeGreaterThanOrEqual(minRows);
  }

  async assertTotalCountVisible(): Promise<void> {
    await expect(
      this.tableTotalCount,
      'The total record count next to the Records title is not visible'
    ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    await expect(
      this.tableTotalCount,
      'The total record count does not contain a number'
    ).toHaveText(/\d+/, { timeout: VISIBILITY_TIMEOUT });
  }

  async changePageSize(pageSize: number): Promise<void> {
    // The paginator page-size control is a native <select>; its <option>s are
    // not individually clickable, so drive it with selectOption.
    await expect(
      this.paginatorSelectPageSize,
      'The page size selector of the records table is not visible'
    ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    await expect(
      this.paginatorInfoPage,
      'The records pagination information is not visible before changing the page size'
    ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    const previousPageSize = await this.paginatorSelectPageSize.inputValue();
    const previousPageInfo = await this.paginatorInfoPage.innerText();
    expect(
      previousPageSize,
      `The records table already uses page size ${pageSize}; the test must choose a different size`
    ).not.toBe(String(pageSize));
    const pageResponse = await retryUntil(
      async () => {
        const requestPromise = this.page.waitForRequest(
          (request) => {
            const url = new URL(request.url());
            return (
              request.method() === 'GET' &&
              url.pathname.endsWith('/merchants/audit-logs') &&
              url.searchParams.get('page_size') === String(pageSize)
            );
          },
          { timeout: VISIBILITY_TIMEOUT }
        );
        await this.paginatorSelectPageSize.selectOption(String(pageSize));
        return (await requestPromise).response();
      },
      (response) => response?.ok() ?? false,
      3
    );
    expect(pageResponse, 'Changing the records page size received no response').toBeTruthy();
    const records = await this.recordsFrom(
      pageResponse as Response,
      'Changing the records page size'
    );
    expect(records.length).toBeLessThanOrEqual(pageSize);
    await expect(this.paginatorSelectPageSize).toHaveValue(String(pageSize), {
      timeout: VISIBILITY_TIMEOUT,
    });
    await expect(
      this.paginatorInfoPage,
      'The records pagination information was not updated after changing the page size'
    ).not.toHaveText(previousPageInfo, { timeout: VISIBILITY_TIMEOUT });
    await expect
      .poll(() => this.tableRows.count(), {
        message: `The records table did not render at most ${pageSize} rows`,
        timeout: VISIBILITY_TIMEOUT,
      })
      .toBeLessThanOrEqual(pageSize);
  }

  async clickRefetch(): Promise<AuditLogRecord[]> {
    await expect(
      this.tableRefreshButton,
      'The records table refresh button is not visible'
    ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    const refetched = this.waitForRecordsResponse();
    await this.tableRefreshButton.click();
    const records = await this.recordsFrom(await refetched, 'Refetching audit log records');
    await this.assertRecordsTableHasRows();
    return records;
  }

  async openDateRangeFilter(): Promise<void> {
    await expect(this.dateFilter, 'The records date range filter is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.dateFilter.click();
    await expect(
      this.calendarDialog(LOGS_DATA_TEST_IDS.dateFilter),
      'The date range calendar did not open'
    ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
  }

  /** The calendar opens on the current month; navigate until the target day is rendered. */
  private async ensureDayIsVisible(
    scope: string,
    isoDay: string,
    maxMonthsBack = 3
  ): Promise<Locator> {
    const dialog = this.calendarDialog(scope);
    const day = this.calendarDay(scope, isoDay);
    const navigationButton = this.calendarNavigationButton(scope, isoDay);
    for (let attempt = 0; attempt <= maxMonthsBack; attempt++) {
      if (await day.isVisible().catch(() => false)) return day;
      await expect(
        navigationButton,
        `The calendar navigation button needed to reach ${isoDay} is not visible`
      ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
      await navigationButton.click();
      await expect(dialog, 'The date range calendar closed while navigating months').toBeVisible({
        timeout: VISIBILITY_TIMEOUT,
      });
    }
    throw new Error(
      `The day ${isoDay} is not selectable after navigating ${maxMonthsBack} months back`
    );
  }

  async assertRecordsDateBounds(): Promise<void> {
    const scope = LOGS_DATA_TEST_IDS.dateFilter;
    await this.openDateRangeFilter();
    const dialog = this.calendarDialog(scope);

    const futureDay = await this.ensureDayIsVisible(scope, isoDaysAgo(-1), 1);
    await expect(futureDay, 'A future records-filter date is enabled').toBeDisabled({
      timeout: VISIBILITY_TIMEOUT,
    });

    const olderThanLimitDay = await this.ensureDayIsVisible(scope, isoDaysAgo(91), 5);
    await expect(
      olderThanLimitDay,
      'A records-filter date older than the 90-day limit is enabled'
    ).toBeDisabled({ timeout: VISIBILITY_TIMEOUT });

    const cancelButton = this.calendarCancelButton(scope);
    await expect(
      cancelButton,
      'The records date calendar cancel button is not visible'
    ).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await cancelButton.click();
    await expect(dialog, 'The records date calendar stayed open after cancelling').toBeHidden({
      timeout: VISIBILITY_TIMEOUT,
    });
  }

  /**
   * Selects a range in an already-open calendar dialog and clicks Confirm.
   * Shared by the records filter and the export drawer — both render the same
   * Calendar molecule under a different test id scope.
   *
   * Clicking the second day before React commits the first is a race: the
   * picker briefly shows a one-day range ("sep 1 – 1, 2026") right after the
   * first click, then the full range summary. Waiting for "any complete-range
   * looking text" is NOT enough — that one-day state matches the same shape
   * (`d – d, yyyy`) — so this waits for the specific end day to appear before
   * confirming (see docs/flaky-test-patterns.md, rule 7).
   */
  private async selectCalendarRange(
    scope: string,
    fromIsoDay: string,
    toIsoDay: string
  ): Promise<void> {
    const dialog = this.calendarDialog(scope);

    await (await this.ensureDayIsVisible(scope, fromIsoDay)).click();
    await expect(
      dialog,
      'The calendar did not register the first selected day before clicking the second one'
    ).toContainText(/\d{1,2}\s*[–-]\s*\d{1,2},\s*\d{4}/, { timeout: VISIBILITY_TIMEOUT });
    await (await this.ensureDayIsVisible(scope, toIsoDay)).click();

    const toDayNumber = String(Number(toIsoDay.slice(-2)));
    const toYear = toIsoDay.slice(0, 4);
    await expect(
      dialog,
      'The calendar did not register a complete date range before confirming'
    ).toContainText(new RegExp(`${toDayNumber},\\s*${toYear}`), {
      timeout: VISIBILITY_TIMEOUT,
    });

    const confirmButton = this.calendarConfirmButton(scope);
    await expect(
      confirmButton,
      'The confirm button of the date range calendar is not enabled'
    ).toBeEnabled({ timeout: VISIBILITY_TIMEOUT });
    await confirmButton.click();

    await expect(
      dialog,
      'The date range calendar stayed open after confirming the range'
    ).toBeHidden({ timeout: VISIBILITY_TIMEOUT });
  }

  /**
   * Applies a range on the records filter and waits for the request that
   * carries it. The response listener is registered before the confirm click
   * on purpose — the request fires immediately and a listener registered
   * afterwards would miss it (see docs/flaky-test-patterns.md, rule 1).
   */
  async applyDateRange(fromIsoDay: string, toIsoDay: string): Promise<void> {
    await this.openDateRangeFilter();

    const filteredRequest = this.waitForRecordsResponse(
      (url) => url.searchParams.has('start_date') && url.searchParams.has('end_date')
    );
    await this.selectCalendarRange(LOGS_DATA_TEST_IDS.dateFilter, fromIsoDay, toIsoDay);
    const response = await filteredRequest;
    const records = await this.recordsFrom(response, 'Filtering audit log records by date');
    expect(records.length, 'The selected date range returned no audit log records').toBeGreaterThan(
      0
    );

    const responseUrl = new URL(response.url());
    const start = Date.parse(responseUrl.searchParams.get('start_date') ?? '');
    const end = Date.parse(responseUrl.searchParams.get('end_date') ?? '');
    expect(Number.isFinite(start), 'The records request has an invalid start_date').toBe(true);
    expect(Number.isFinite(end), 'The records request has an invalid end_date').toBe(true);
    this.lastAppliedRecordRange = { start, end };

    for (const record of records) {
      const timestamp = Date.parse(record.timestamp ?? '');
      expect(Number.isFinite(timestamp), 'A filtered audit log has no valid timestamp').toBe(true);
      expect(timestamp, 'A filtered audit log predates the selected range').toBeGreaterThanOrEqual(
        start
      );
      expect(timestamp, 'A filtered audit log exceeds the selected range').toBeLessThan(end);
    }
  }

  async applyDateRangeContainingAvailableRecord(): Promise<void> {
    const records = await this.clickRefetch();
    const timestamp = records.find((record) =>
      Number.isFinite(Date.parse(record.timestamp ?? ''))
    )?.timestamp;
    expect(
      timestamp,
      'The unfiltered audit logs have no record with a valid timestamp'
    ).toBeTruthy();

    const recordDay = (timestamp as string).slice(0, 10);
    const today = toIsoDay(new Date());
    const fromIsoDay = recordDay < today ? recordDay : shiftIsoDay(recordDay, -1);
    const toDay = recordDay < today ? shiftIsoDay(recordDay, 1) : recordDay;

    await this.applyDateRange(fromIsoDay, toDay);
  }

  /** Asserts the filter control displays a selected range instead of its placeholder. */
  async assertDateRangeIsDisplayed(): Promise<void> {
    await expect(
      this.dateFilter,
      'The date filter does not display the selected range'
    ).toContainText(/\d{4}/, { timeout: VISIBILITY_TIMEOUT });
  }

  async goToExportPage(): Promise<void> {
    await expect(this.exportButton, 'The Logs Export button is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.exportButton.click();
    await this.page.waitForURL('**/logs/export', { timeout: VISIBILITY_TIMEOUT });
  }

  async assertExportSubmitIsDisabled(): Promise<void> {
    await expect(
      this.exportSubmitButton,
      'The export submit button should start disabled before a valid date range is picked'
    ).toBeDisabled({ timeout: VISIBILITY_TIMEOUT });
  }

  /** Selects the export date range. Enables the submit button — no request fires yet. */
  async applyExportDateRange(fromIsoDay: string, toIsoDay: string): Promise<void> {
    await expect(
      this.exportDateRangeTrigger,
      'The export date range trigger is not visible'
    ).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.exportDateRangeTrigger.click();
    await expect(
      this.calendarDialog(LOGS_DATA_TEST_IDS.exportDateRangeScope),
      'The export date range calendar did not open'
    ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });

    await this.selectCalendarRange(LOGS_DATA_TEST_IDS.exportDateRangeScope, fromIsoDay, toIsoDay);

    await expect(
      this.exportSubmitButton,
      'The export submit button did not become enabled after picking a complete date range'
    ).toBeEnabled({ timeout: VISIBILITY_TIMEOUT });
  }

  async selectExportSection(section: string): Promise<void> {
    await expect(
      this.exportSectionFilterTrigger,
      'The export section filter trigger is not visible'
    ).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.exportSectionFilterTrigger.click();
    const option = this.exportSectionOption(section);
    await expect(option, `The export section option "${section}" is not visible`).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await option.click();
    // Close the combobox popover so it does not obscure the submit button.
    await this.page.keyboard.press('Escape');
  }

  /**
   * Submits the export form and waits for the app to navigate to the
   * Downloads tab, which only happens after the export request succeeds.
   * Returns the created export's id straight from the response body — NOT
   * inferred from the downloads table's first row. On a merchant shared with
   * other suites (or repeated runs of this one), other exports can be created
   * with a later id/timestamp between submit and the table's next render,
   * so "first row" is not a reliable way to identify which row is ours.
   *
   * The backend enforces a per-merchant concurrent-export-job cap and returns
   * `400 MA-2002 too many concurrent export jobs for this merchant` when the
   * shared roles-and-permissions merchant already has jobs in flight (from
   * this suite running repeatedly, or alongside other specs). This is not
   * request-shape flakiness — the payload is valid — so it retries only on
   * that specific error code with a real backoff, never on any other failure.
   */
  async submitExportAndAssertNavigation(maxAttempts = 3): Promise<string> {
    await expect(this.exportSubmitButton, 'The export submit button is not enabled').toBeEnabled({
      timeout: VISIBILITY_TIMEOUT,
    });

    const result = await retryUntil(
      async () => {
        const exportResponse = this.page.waitForResponse(
          (response) =>
            response.request().method() === 'POST' &&
            response.url().includes('/merchants/audit-logs/exports'),
          { timeout: VISIBILITY_TIMEOUT }
        );
        await this.exportSubmitButton.click();
        const response = await exportResponse;
        const body = (await response.json().catch(() => null)) as {
          code?: string;
          export_id?: string;
        } | null;
        if (!response.ok()) {
          expect(
            body?.code,
            `The export request failed with an unexpected error (status ${response.status()}): ${JSON.stringify(body)}`
          ).toBe('MA-2002');
        }
        return { response, body };
      },
      ({ response }) => response.ok(),
      maxAttempts,
      5000
    );

    expect(
      result.response.ok(),
      `The export request kept hitting the concurrent-job limit (MA-2002) after ${maxAttempts} attempts`
    ).toBe(true);
    const exportId = result.body?.export_id;
    await expect(
      this.exportSuccessToast,
      'The export success notification is not visible'
    ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    await this.page.waitForURL('**/logs/downloads', { timeout: VISIBILITY_TIMEOUT });
    expect(exportId, 'The export creation response did not include an export_id').toBeTruthy();
    return exportId as string;
  }

  async assertExportListed(exportId: string): Promise<void> {
    const row = this.downloadsRow(exportId);
    await expect(row, `The newly requested export ${exportId} is not listed`).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });

    const nameCell = this.downloadsNameCell(exportId);
    const createdAtCell = this.downloadsCreatedAtCell(exportId);
    const statusChip = this.downloadsStatusChip(exportId);

    await expect(nameCell, `Export ${exportId} has no name`).toContainText(exportId, {
      timeout: VISIBILITY_TIMEOUT,
    });
    await expect(createdAtCell, `Export ${exportId} has no creation date`).not.toHaveText(
      /^\s*-?\s*$/,
      {
        timeout: VISIBILITY_TIMEOUT,
      }
    );
    await expect(statusChip, `Export ${exportId} has no status`).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
  }

  async submitExportAndAssertError(): Promise<void> {
    await this.page.context().route('**/merchants/audit-logs/exports**', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Forced by ADM-T890' }),
      });
    });

    await expect(this.exportSubmitButton, 'The export submit button is not enabled').toBeEnabled({
      timeout: VISIBILITY_TIMEOUT,
    });
    const request = this.page.waitForRequest(
      (candidate) =>
        candidate.method() === 'POST' && candidate.url().includes('/merchants/audit-logs/exports'),
      { timeout: VISIBILITY_TIMEOUT }
    );
    await this.exportSubmitButton.click();
    await request;

    await expect(this.exportErrorToast, 'The export error notification is not visible').toBeVisible(
      {
        timeout: VISIBILITY_TIMEOUT,
      }
    );
    await expect(this.exportErrorToast).toHaveText(
      /^(We couldn't request the export\. Try again\.|No pudimos solicitar la exportación\. Inténtalo de nuevo\.)$/,
      { timeout: VISIBILITY_TIMEOUT }
    );
    await this.page.context().unroute('**/merchants/audit-logs/exports**');
  }

  async assertExportFormPreserved(section: string): Promise<void> {
    await this.page.waitForURL('**/logs/export', { timeout: VISIBILITY_TIMEOUT });
    await expect(
      this.exportDateRangeTrigger,
      'The selected export date range was cleared after the request failed'
    ).toContainText(/\d{4}/, { timeout: VISIBILITY_TIMEOUT });
    await expect(
      this.exportSectionFilterTrigger,
      'The selected export section was cleared after the request failed'
    ).toContainText(new RegExp(section === 'USERS' ? 'usuarios|users' : section, 'i'), {
      timeout: VISIBILITY_TIMEOUT,
    });
    await expect(
      this.exportSubmitButton,
      'The export submit button is not enabled after the failed request'
    ).toBeEnabled({ timeout: VISIBILITY_TIMEOUT });
  }

  async assertViewOnlyAccess(): Promise<void> {
    await this.page.waitForURL('**/logs/records', { timeout: VISIBILITY_TIMEOUT });
    await expect(
      this.recordsTab,
      'The Records tab is not selected for a view-only user'
    ).toHaveAttribute('aria-selected', 'true', { timeout: VISIBILITY_TIMEOUT });
    await expect(
      this.downloadsTab,
      'The Downloads tab must be hidden for a view-only user'
    ).toBeHidden({ timeout: VISIBILITY_TIMEOUT });
    await expect(
      this.exportButton,
      'The Export button must be hidden for a view-only user'
    ).toBeHidden({ timeout: VISIBILITY_TIMEOUT });
  }

  async assertExportRouteIsBlocked(): Promise<void> {
    await this.page.waitForURL(/\/logs\/export\/?$/, { timeout: VISIBILITY_TIMEOUT });
    await expect(
      this.notFoundState,
      'The forbidden Logs export route did not render its 404 state'
    ).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await expect(
      this.exportSubmitButton,
      'The export form must be hidden on the forbidden route'
    ).toBeHidden({ timeout: VISIBILITY_TIMEOUT });
  }

  async openForbiddenExportAndAssertNotFound(): Promise<void> {
    await this.page.goto(`${envConfig.ADMIN_URL}/logs/export`);
    await this.assertExportRouteIsBlocked();
  }

  /**
   * Types into the pinned records search input. The field debounces (300ms in
   * admin-ff), so the caller must wait/assert afterwards rather than reading
   * the table synchronously.
   */
  async searchRecords(term: string): Promise<void> {
    await expect(this.searchInput, 'The records search input is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    const queryKey = term.includes('@') ? 'email' : 'name';
    const searchResponse = this.waitForRecordsResponse(
      (url) => url.searchParams.get(queryKey) === term
    );
    await this.searchInput.fill(term);
    const records = await this.recordsFrom(await searchResponse, 'Searching audit log records');
    expect(records.length, `The search for "${term}" returned no records`).toBeGreaterThan(0);
    for (const record of records) {
      const value = queryKey === 'email' ? record.actor_email : record.actor_name;
      expect(
        value?.toLowerCase(),
        `A search result does not match "${term}" in ${queryKey}`
      ).toContain(term.toLowerCase());
    }
    await this.assertRecordsTableHasRows();
  }

  async getMatchingRecordExecutedBy(
    section: string,
    action: string,
    severity: string,
    result: string
  ): Promise<string> {
    const matches = (record: AuditLogRecord) =>
      record.event_category?.toUpperCase() === section.toUpperCase() &&
      record.event_name === action &&
      record.event_severity?.toUpperCase() === severity.toUpperCase() &&
      record.event_result?.toUpperCase() === result.toUpperCase() &&
      Boolean(record.actor_email || record.actor_name);
    const records = await retryUntil(
      () => this.clickRefetch(),
      (refetchedRecords) => refetchedRecords.some(matches),
      10
    );
    const match = records.find(matches);
    expect(
      match,
      `No audit record matches ${section}/${action}/${severity}/${result}`
    ).toBeTruthy();
    return (match?.actor_email || match?.actor_name || '').trim();
  }

  async assertAdvancedFiltersAvailable(): Promise<void> {
    await expect(this.moreFiltersButton, 'The "Agregar filtro" button is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.moreFiltersButton.click();

    for (const filter of ADVANCED_FILTERS) {
      await expect(
        this.moreFiltersOption(filter),
        `The "${filter}" filter option is not visible in the picker`
      ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    }
    await this.page.keyboard.press('Escape');
  }

  /** Enables one optional advanced filter and applies the selection. */
  async enableAdvancedFilter(filter: AdvancedFilter): Promise<void> {
    await expect(this.moreFiltersButton, 'The "Agregar filtro" button is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.moreFiltersButton.click();

    const row = this.moreFiltersOption(filter);
    await expect(row, `The "${filter}" filter option is not visible in the picker`).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await row.click();

    await expect(this.moreFiltersApplyButton, 'The "Aplicar" button is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.moreFiltersApplyButton.click();
  }

  async selectSectionFilterOption(section: string): Promise<void> {
    await expect(
      this.sectionFilterTrigger,
      'The section filter trigger is not visible'
    ).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.sectionFilterTrigger.click();
    const option = this.sectionFilterOption(section);
    await expect(option, `The section filter option "${section}" is not visible`).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    const filteredResponse = this.waitForRecordsResponse(
      (url) => url.searchParams.get('category') === section
    );
    await option.click();
    await this.page.keyboard.press('Escape');
    const records = await this.recordsFrom(
      await filteredResponse,
      `Filtering audit log records by section ${section}`
    );
    expect(records.length, `The section ${section} returned no records`).toBeGreaterThan(0);
    for (const record of records) {
      expect(record.event_category?.toUpperCase()).toBe(section.toUpperCase());
    }

    await this.assertRecordsTableHasRows();
    const expectedSection = new RegExp(section === 'USERS' ? 'usuarios|users' : section, 'i');
    for (const row of await this.tableRows.all()) {
      const rowId = (await row.getAttribute('data-testid'))?.replace(
        LOGS_DATA_TEST_IDS.tableRowPrefix,
        ''
      );
      expect(rowId, 'An audit-log row has no id').toBeTruthy();
      await expect(this.recordSectionCell(rowId as string)).toHaveText(expectedSection, {
        timeout: VISIBILITY_TIMEOUT,
      });
    }
  }

  async selectSeverityFilterOption(severity: string): Promise<void> {
    await expect(
      this.severityFilterTrigger,
      'The severity filter trigger is not visible'
    ).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.severityFilterTrigger.click();
    const option = this.severityFilterOption(severity);
    await expect(option, `The severity filter option "${severity}" is not visible`).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    const filteredResponse = this.waitForRecordsResponse(
      (url) =>
        url.searchParams.get('category') === 'USERS' &&
        url.searchParams.get('severity') === severity
    );
    await option.click();
    await this.page.keyboard.press('Escape');
    const records = await this.recordsFrom(
      await filteredResponse,
      `Filtering audit log records by severity ${severity}`
    );
    expect(
      records.length,
      `The combined Users/${severity} filters returned no records`
    ).toBeGreaterThan(0);
    for (const record of records) {
      expect(record.event_category?.toUpperCase()).toBe('USERS');
      expect(record.event_severity?.toUpperCase()).toBe(severity.toUpperCase());
    }
    await this.assertRecordsTableHasRows();
  }

  async selectActionFilterOption(action: string): Promise<void> {
    await expect(this.actionFilterTrigger, 'The action filter trigger is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.actionFilterTrigger.click();
    const option = this.actionFilterOption(action);
    await expect(option, `The action filter option "${action}" is not visible`).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    const filteredResponse = this.waitForRecordsResponse(
      (url) =>
        url.searchParams.get('category') === 'USERS' && url.searchParams.get('event') === action
    );
    await option.click();
    await this.page.keyboard.press('Escape');
    const records = await this.recordsFrom(
      await filteredResponse,
      `Filtering audit log records by action ${action}`
    );
    expect(records.length, `The action ${action} returned no records`).toBeGreaterThan(0);
    for (const record of records) expect(record.event_name).toBe(action);
    await this.assertRecordsTableHasRows();
  }

  async selectResultFilterOption(result: string): Promise<void> {
    await expect(this.resultFilterTrigger, 'The result filter trigger is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.resultFilterTrigger.click();
    const option = this.resultFilterOption(result);
    await expect(option, `The result filter option "${result}" is not visible`).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    const filteredResponse = this.waitForRecordsResponse(
      (url) => url.searchParams.get('result') === result
    );
    await option.click();
    await this.page.keyboard.press('Escape');
    const records = await this.recordsFrom(
      await filteredResponse,
      `Filtering audit log records by result ${result}`
    );
    expect(records.length, `The result ${result} returned no records`).toBeGreaterThan(0);
    for (const record of records)
      expect(record.event_result?.toUpperCase()).toBe(result.toUpperCase());
    await this.assertRecordsTableHasRows();
  }

  /**
   * Clears all records filters: the pinned search input (its typed value is
   * NOT touched by the picker clear action, since that button only resets
   * which non-pinned filters are enabled) plus the advanced filter selection.
   * Clearing resets the picker's own checkbox selection; previously applied
   * filter chips stay on the filter bar until Apply commits the cleared state.
   */
  async clearAllFilters(): Promise<AuditLogRecord[]> {
    await expect(this.searchInput, 'The records search input is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    const unfilteredResponse = this.waitForRecordsResponse((url) =>
      RECORD_FILTER_QUERY_KEYS.every((key) => !url.searchParams.has(key))
    );
    await this.searchInput.fill('');

    await expect(this.moreFiltersButton, 'The "Agregar filtro" button is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.moreFiltersButton.click();
    await expect(this.moreFiltersClearButton, 'The "Limpiar" button is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.moreFiltersClearButton.click();
    await expect(this.moreFiltersApplyButton, 'The "Aplicar" button is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.moreFiltersApplyButton.click();
    const records = await this.recordsFrom(await unfilteredResponse, 'Clearing audit log filters');
    expect(records.length, 'Clearing filters returned no audit log records').toBeGreaterThan(0);
    await expect(this.searchInput).toHaveValue('', { timeout: VISIBILITY_TIMEOUT });
    await expect(this.sectionFilterTrigger).toBeHidden({ timeout: VISIBILITY_TIMEOUT });
    await expect(this.severityFilterTrigger).toBeHidden({ timeout: VISIBILITY_TIMEOUT });
    return records;
  }

  async clearDateRangeAndAssertRestored(): Promise<void> {
    expect(
      this.lastAppliedRecordRange,
      'No date range was applied before clearing it'
    ).toBeTruthy();
    const unfilteredResponse = this.waitForRecordsResponse((url) =>
      RECORD_FILTER_QUERY_KEYS.every((key) => !url.searchParams.has(key))
    );
    await expect(this.clearFiltersButton, 'The clear-filters button is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.clearFiltersButton.click();
    const records = await this.recordsFrom(
      await unfilteredResponse,
      'Clearing the records date range'
    );
    expect(records.length, 'Clearing the date range returned no records').toBeGreaterThan(0);
    await expect(
      this.dateFilter,
      'The date range remained selected after clearing filters'
    ).not.toContainText(/\d{4}/, { timeout: VISIBILITY_TIMEOUT });
  }

  async expandFirstRecordAndAssertDetails(): Promise<void> {
    const rowId = await this.firstRecordId();
    const expandButton = this.recordToggleButton(rowId);
    await expect(expandButton, 'The first audit-log row expand button is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await expandButton.click();
    await expect(expandButton).toHaveAttribute('aria-expanded', 'true', {
      timeout: VISIBILITY_TIMEOUT,
    });
    await expect(this.rowDetails(rowId), 'The expanded row details are not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await expect(
      this.detailTabDetails,
      'The Details tab is not selected by default'
    ).toHaveAttribute('aria-selected', 'true', { timeout: VISIBILITY_TIMEOUT });
    await expect(this.detailsTable, 'The expanded log Details table is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await expect(
      this.detailsTableFirstRow,
      'The expanded log Details table has no rows'
    ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
  }

  async openJsonAndSearch(term: string): Promise<void> {
    await expect(this.detailTabJson, 'The JSON detail tab is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.detailTabJson.click();
    await expect(this.jsonContent, 'The JSON viewer is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    const fullJson = await this.jsonContent.innerText();
    expect(fullJson, 'The JSON viewer does not contain the search term before filtering').toContain(
      term
    );
    await expect(this.jsonSearchInput, 'The JSON search input is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.jsonSearchInput.fill(term);
    await expect(this.jsonSearchInput).toHaveValue(term, { timeout: VISIBILITY_TIMEOUT });
    await expect(this.jsonContent).toContainText(term, { timeout: VISIBILITY_TIMEOUT });
    await expect
      .poll(() => this.jsonContent.innerText(), {
        message: 'The JSON viewer content did not change after applying the search',
        timeout: VISIBILITY_TIMEOUT,
      })
      .not.toBe(fullJson);
  }

  async copyFirstRecordEntry(): Promise<void> {
    const rowId = await this.firstRecordId();
    const ipCell = this.recordIpCell(rowId);
    await expect(ipCell, 'The first audit-log row IP cell is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    const expectedIp = (await ipCell.innerText()).trim();
    const actionsButton = this.recordActionsButton(rowId);
    const copyEntry = this.recordCopyEntry(rowId);
    await expect(
      actionsButton,
      'The first audit-log row actions button is not visible'
    ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    await actionsButton.click();
    await expect(copyEntry, 'The copy-entry action is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await copyEntry.click();
    await expect(actionsButton).toHaveAttribute('aria-expanded', 'false', {
      timeout: VISIBILITY_TIMEOUT,
    });
    await expect(copyEntry).toBeHidden({ timeout: VISIBILITY_TIMEOUT });
    await actionsButton.click();
    await expect(copyEntry).toContainText(/copiado|copied/i, { timeout: VISIBILITY_TIMEOUT });
    const copiedEntry = await this.page.evaluate(() => navigator.clipboard.readText());
    expect(copiedEntry, 'The copied audit-log entry is empty').toBeTruthy();
    expect(copiedEntry, 'The copied audit-log entry does not include its IP').toContain(expectedIp);
    await this.page.keyboard.press('Escape');
    await expect(actionsButton).toHaveAttribute('aria-expanded', 'false', {
      timeout: VISIBILITY_TIMEOUT,
    });
    await expect(copyEntry).toBeHidden({ timeout: VISIBILITY_TIMEOUT });
  }

  async copyFirstRecordIp(): Promise<void> {
    const rowId = await this.firstRecordId();
    const ipCell = this.recordIpCell(rowId);
    await expect(ipCell, 'The first audit-log row IP cell is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    const expectedIp = (await ipCell.innerText()).trim();
    const actionsButton = this.recordActionsButton(rowId);
    const copyIp = this.recordCopyIp(rowId);
    await expect(
      actionsButton,
      'The first audit-log row actions button is not visible'
    ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    await actionsButton.click();
    await expect(copyIp, 'The copy-IP action is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await copyIp.click();
    await expect(actionsButton).toHaveAttribute('aria-expanded', 'false', {
      timeout: VISIBILITY_TIMEOUT,
    });
    await expect(copyIp).toBeHidden({ timeout: VISIBILITY_TIMEOUT });
    await actionsButton.click();
    await expect(copyIp).toContainText(/copiado|copied/i, { timeout: VISIBILITY_TIMEOUT });
    await expect
      .poll(() => this.page.evaluate(() => navigator.clipboard.readText()), {
        message: 'The clipboard does not contain the selected IP',
        timeout: VISIBILITY_TIMEOUT,
      })
      .toBe(expectedIp);
    await this.page.keyboard.press('Escape');
    await expect(actionsButton).toHaveAttribute('aria-expanded', 'false', {
      timeout: VISIBILITY_TIMEOUT,
    });
    await expect(copyIp).toBeHidden({ timeout: VISIBILITY_TIMEOUT });
  }

  async collapseFirstRecord(): Promise<void> {
    const rowId = await this.firstRecordId();
    const expandButton = this.recordToggleButton(rowId);
    await expect(
      expandButton,
      'The first audit-log row collapse button is not visible'
    ).toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await expandButton.click();
    await expect(expandButton).toHaveAttribute('aria-expanded', 'false', {
      timeout: VISIBILITY_TIMEOUT,
    });
    await expect(this.rowDetails(rowId)).toBeHidden({ timeout: VISIBILITY_TIMEOUT });
  }

  async assertDownloadsTableHasRows(minRows = 1): Promise<void> {
    await expect(
      this.downloadsRows.first(),
      'The downloads table did not render any export row'
    ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    const rowCount = await this.downloadsRows.count();
    expect(
      rowCount,
      `Expected at least ${minRows} export rows in Downloads, but the table has ${rowCount}`
    ).toBeGreaterThanOrEqual(minRows);
  }

  async stubDownloadsPagination(): Promise<void> {
    const firstPage = Array.from({ length: 10 }, (_, index) => ({
      export_id: `e2e-export-${String(index + 1).padStart(2, '0')}`,
      status: 'completed',
      created_at: new Date(Date.now() - index * 60000).toISOString(),
    }));
    const secondPage = [
      {
        export_id: 'e2e-export-11',
        status: 'expired',
        created_at: new Date(Date.now() - 10 * 60000).toISOString(),
      },
    ];

    // Register on the context after the suite's catch-all request mock. Playwright
    // evaluates matching context routes newest-first, so this fixture gets a chance
    // to fulfill the exports request before the catch-all continues it to the API.
    await this.page.context().route('**/merchants/audit-logs/exports**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      const cursor = new URL(route.request().url()).searchParams.get('cursor');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          cursor
            ? {
                data: secondPage,
                pagination: { next_cursor: '', page_size: 10, has_more: false },
              }
            : {
                data: firstPage,
                pagination: {
                  next_cursor: 'e2e-older-page',
                  page_size: 10,
                  has_more: true,
                },
              }
        ),
      });
    });
  }

  async goToDownloads(): Promise<void> {
    await expect(this.downloadsTab, 'The Downloads tab is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    const firstPageResponse =
      this.downloadsNextCursor === undefined
        ? this.waitForDownloadsResponse((url) => !url.searchParams.has('cursor'))
        : undefined;
    await this.downloadsTab.click();
    await this.page.waitForURL('**/logs/downloads', { timeout: VISIBILITY_TIMEOUT });
    if (firstPageResponse) {
      await this.rememberDownloadsCursor(await firstPageResponse);
    }
    await this.assertDownloadsTableHasRows();
  }

  async copyFirstExportName(): Promise<void> {
    const firstRow = this.downloadsRows.first();
    await expect(firstRow, 'The downloads table did not render an export row').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    const exportId = (await firstRow.getAttribute('data-testid'))?.replace(
      LOGS_DATA_TEST_IDS.downloadsTableRowPrefix,
      ''
    );
    expect(exportId, 'The first export row has no id').toBeTruthy();
    const copyButton = this.copyExportNameButton(exportId as string);
    await expect(
      copyButton,
      `The copy-name button for export ${exportId} is not visible`
    ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    await copyButton.click();
    const copiedName = await this.page.evaluate(() => navigator.clipboard.readText());
    expect(copiedName, 'The copied export name is empty').toBeTruthy();
    await expect(firstRow, 'The copied export name does not match its visible row').toContainText(
      copiedName,
      { timeout: VISIBILITY_TIMEOUT }
    );
  }

  async goToNextDownloadsPage(): Promise<void> {
    const firstRowId = await this.downloadsRows.first().getAttribute('data-testid');
    expect(firstRowId, 'The first Downloads row has no data-testid').toBeTruthy();
    expect(
      this.downloadsNextCursor,
      'The first Downloads response did not provide a cursor for the next page'
    ).toBeTruthy();
    await expect(
      this.downloadsPaginatorNext,
      'The Downloads next-page button is not enabled'
    ).toBeEnabled({
      timeout: VISIBILITY_TIMEOUT,
    });
    const expectedCursor = this.downloadsNextCursor as string;
    const nextPageResponse = this.waitForDownloadsResponse(
      (url) => url.searchParams.get('cursor') === expectedCursor
    );
    await this.downloadsPaginatorNext.click();
    const response = await nextPageResponse;
    expect(response.ok(), `Loading the next Downloads page failed with ${response.status()}`).toBe(
      true
    );
    await this.rememberDownloadsCursor(response);
    await expect(
      this.downloadsRows.first(),
      'The Downloads table did not render a different first row on the next page'
    ).not.toHaveAttribute('data-testid', firstRowId as string, {
      timeout: VISIBILITY_TIMEOUT,
    });
    await expect(
      this.downloadsPaginatorPrevious,
      'Forward-only pagination must not expose a previous-page button'
    ).toBeHidden({ timeout: VISIBILITY_TIMEOUT });
  }

  async cancelExportAndAssertSectionCarryover(section: string): Promise<void> {
    await expect(this.exportCancelButton, 'The export cancel button is not visible').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    await this.exportCancelButton.click();
    await this.page.waitForURL('**/logs/records', { timeout: VISIBILITY_TIMEOUT });
    await this.assertRecordsTableHasRows();
    const expectedSection = new RegExp(section === 'USERS' ? 'usuarios|users' : section, 'i');
    await expect(
      this.sectionFilterTrigger,
      'The section filter was not preserved after cancelling Export'
    ).toContainText(expectedSection, { timeout: VISIBILITY_TIMEOUT });
  }

  /** Polls the first Downloads page until the asynchronous export completes. */
  async waitForExportStatus(
    exportId: string,
    status: string,
    maxRefreshAttempts = 8,
    perAttemptTimeoutMs = 8000
  ): Promise<void> {
    const chip = this.exportStatusChip(exportId, status);
    for (let attempt = 1; attempt <= maxRefreshAttempts; attempt++) {
      const isVisible = await chip
        .first()
        .waitFor({ state: 'visible', timeout: perAttemptTimeoutMs })
        .then(() => true)
        .catch(() => false);
      if (isVisible) return;
      if (attempt < maxRefreshAttempts) {
        const firstPageResponse = this.page.waitForResponse(
          (response) => {
            const url = new URL(response.url());
            return (
              response.request().method() === 'GET' &&
              url.pathname.endsWith('/merchants/audit-logs/exports') &&
              !url.searchParams.has('cursor')
            );
          },
          { timeout: VISIBILITY_TIMEOUT }
        );
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        expect((await firstPageResponse).ok(), 'Reloading the first exports page failed').toBe(
          true
        );
      }
    }
    throw new Error(
      `Export ${exportId} did not reach status "${status}" after ${maxRefreshAttempts} refresh attempts`
    );
  }

  async clickDownloadsRefetch(): Promise<void> {
    await expect(
      this.downloadsRefreshButton,
      'The downloads table refresh button is not visible'
    ).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    const refetched = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/merchants/audit-logs/exports'),
      { timeout: VISIBILITY_TIMEOUT }
    );
    await this.downloadsRefreshButton.click();
    const response = await refetched;
    expect(response.ok(), `Refetching exports failed with status ${response.status()}`).toBe(true);
  }

  async assertDownloadButtonDisabled(exportId: string): Promise<void> {
    await expect(
      this.exportDownloadButton(exportId),
      `The download button for export ${exportId} should be disabled while it is not completed`
    ).toBeDisabled({ timeout: VISIBILITY_TIMEOUT });
  }

  async assertExpiredExportDownloadDisabled(): Promise<void> {
    while ((await this.expiredDownloadRow.count()) === 0) {
      await this.goToNextDownloadsPage();
    }
    await expect(this.expiredDownloadRow, 'The Downloads table has no expired export').toBeVisible({
      timeout: VISIBILITY_TIMEOUT,
    });
    const exportId = (await this.expiredDownloadRow.getAttribute('data-testid'))?.replace(
      LOGS_DATA_TEST_IDS.downloadsTableRowPrefix,
      ''
    );
    expect(exportId, 'The expired export row has no id').toBeTruthy();
    await this.assertDownloadButtonDisabled(exportId as string);
  }

  /** Clicks the download button for a completed export and asserts the browser download event fires. */
  async downloadExport(exportId: string): Promise<void> {
    const downloadButton = this.exportDownloadButton(exportId);
    await expect(
      downloadButton,
      `The download button for export ${exportId} should be enabled once it is completed`
    ).toBeEnabled({ timeout: VISIBILITY_TIMEOUT });

    const downloadEvent = this.page.waitForEvent('download', { timeout: VISIBILITY_TIMEOUT });
    await downloadButton.click();
    const download = await downloadEvent;
    expect(download.suggestedFilename(), 'The triggered download has no filename').toBeTruthy();
    expect(await download.path(), 'The export download did not finish').toBeTruthy();
    expect(await download.failure(), 'The export download failed').toBeNull();
    await expect(
      this.downloadErrorToast,
      'The download error notification appeared after a successful download'
    ).toBeHidden({ timeout: VISIBILITY_TIMEOUT });
  }
}
