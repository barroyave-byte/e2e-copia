import { Context, FrameworkPlugin } from '../interface';
import { AdminLogsPage, isoDaysAgo } from '@pages/admin/logs/adminLogsPage';

export type RelativeDateRange = { fromDaysAgo: number; toDaysAgo?: number };

function toRelativeIsoRange({ fromDaysAgo, toDaysAgo }: RelativeDateRange): [string, string] {
  return [isoDaysAgo(fromDaysAgo), isoDaysAgo(toDaysAgo ?? 0)];
}

export class PluginAdminLogs extends FrameworkPlugin {
  pluginBaseName = 'admin.logs';

  logsPage!: AdminLogsPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.logsPage = new AdminLogsPage(context.page);
  }

  /** @description Clicks the Logs sidebar menu item and waits for the /logs/records route to load. */
  async $tf_goToRecords() {
    await this.logsPage.goToLogsRecords();
  }

  /** @description Asserts that the audit log records table shows its five visible column headers (createdAt, executedBy, action, section, ip). */
  async $tf_assertRecordsColumns() {
    await this.logsPage.assertRecordsColumnsVisible();
  }

  /** @description Asserts the audit log records table has at least minRows rows. */
  async $tf_assertRecordsTableHasRows({ minRows }: { minRows?: number } = {}) {
    await this.logsPage.assertRecordsTableHasRows(minRows ?? 1);
  }

  /** @description Asserts that the total record count is displayed next to the Records table title. */
  async $tf_assertTotalCountVisible() {
    await this.logsPage.assertTotalCountVisible();
  }

  /** @description Opens the page size selector of the records table, selects the given page size, and asserts the table shows at most that many rows. */
  async $tf_changePageSize({ pageSize }: { pageSize: number }) {
    await this.logsPage.changePageSize(pageSize);
  }

  /** @description Clicks the refresh (refetch) button of the audit log records table. */
  async $tf_clickRefetch() {
    await this.logsPage.clickRefetch();
  }

  /** @description Applies a date range on the records list relative to today, confirms it, and waits for the filtered audit logs request. */
  async $tf_applyDateRange(params: RelativeDateRange) {
    const [fromIsoDay, toIsoDay] = toRelativeIsoRange(params);
    await this.logsPage.applyDateRange(fromIsoDay, toIsoDay);
  }

  /** @description Selects a date range containing a record returned by the current merchant, avoiding assumptions about when shared audit data was last populated. */
  async $tf_applyDateRangeContainingAvailableRecord() {
    await this.logsPage.applyDateRangeContainingAvailableRecord();
  }

  /** @description Asserts the records date filter displays a selected range instead of its placeholder. */
  async $tf_assertDateRangeIsDisplayed() {
    await this.logsPage.assertDateRangeIsDisplayed();
  }

  /** @description Asserts that tomorrow and a date older than the 90-day records limit are disabled in the date picker. */
  async $tf_assertRecordsDateBounds() {
    await this.logsPage.assertRecordsDateBounds();
  }

  /** @description Clears the selected records date range and verifies unfiltered records are restored. */
  async $tf_clearDateRangeAndAssertRestored() {
    await this.logsPage.clearDateRangeAndAssertRestored();
  }

  /** @description Clicks the Export button on the records page and waits for the /logs/export route to load. */
  async $tf_goToExportPage() {
    await this.logsPage.goToExportPage();
  }

  /** @description Asserts the export submit button starts disabled before a valid date range is picked. */
  async $tf_assertExportSubmitIsDisabled() {
    await this.logsPage.assertExportSubmitIsDisabled();
  }

  /** @description Selects an export date range relative to today and confirms it, enabling the submit button. */
  async $tf_applyExportDateRange(params: RelativeDateRange) {
    const [fromIsoDay, toIsoDay] = toRelativeIsoRange(params);
    await this.logsPage.applyExportDateRange(fromIsoDay, toIsoDay);
  }

  /** @description Opens the export section filter and selects the given section option (e.g. USERS, AUTH, SECURITY, REPORTS, ORDERS). */
  async $tf_selectExportSection({ section }: { section: string }) {
    await this.logsPage.selectExportSection(section);
  }

  /** @description Submits the export form and waits for the app to navigate to the Downloads tab, which only happens once the export request succeeds. Returns the created export's id (read from the response body) — use saveAs to reference it later. */
  async $tf_submitExportAndAssertNavigation() {
    return this.logsPage.submitExportAndAssertNavigation();
  }

  /** @description Asserts the export created by submitExportAndAssertNavigation is listed with name, creation date, and status. */
  async $tf_assertExportListed({ exportId }: { exportId: string }) {
    await this.logsPage.assertExportListed(exportId);
  }

  /** @description Forces the export POST to return 500, submits the form, and asserts the error notification is shown without navigation. */
  async $tf_submitExportAndAssertError() {
    await this.logsPage.submitExportAndAssertError();
  }

  /** @description Asserts the app remains on Export with its date range and section selection preserved after an error. */
  async $tf_assertExportFormPreserved({ section }: { section: string }) {
    await this.logsPage.assertExportFormPreserved(section);
  }

  /** @description Asserts the Downloads table has at least minRows export rows. */
  async $tf_assertDownloadsTableHasRows({ minRows }: { minRows?: number } = {}) {
    await this.logsPage.assertDownloadsTableHasRows(minRows ?? 1);
  }

  /** @description Stubs two deterministic Downloads API pages so copy and forward-pagination behavior does not depend on shared export history. */
  async $tf_stubDownloadsPagination() {
    await this.logsPage.stubDownloadsPagination();
  }

  /** @description Opens the Downloads tab and waits for export rows. */
  async $tf_goToDownloads() {
    await this.logsPage.goToDownloads();
  }

  /** @description Copies the first export name and verifies the clipboard matches the visible row. */
  async $tf_copyFirstExportName() {
    await this.logsPage.copyFirstExportName();
  }

  /** @description Advances the forward-only Downloads paginator and asserts no previous control exists. */
  async $tf_goToNextDownloadsPage() {
    await this.logsPage.goToNextDownloadsPage();
  }

  /** @description Cancels Export and verifies its section selection carries over to Records. */
  async $tf_cancelExportAndAssertSectionCarryover({ section }: { section: string }) {
    await this.logsPage.cancelExportAndAssertSectionCarryover(section);
  }

  /** @description Polls the Downloads table (refreshing periodically) until the given export id reaches the target status (e.g. "completed"), since export processing is asynchronous and a refetch is required to observe the transition. */
  async $tf_waitForExportStatus({ exportId, status }: { exportId: string; status: string }) {
    await this.logsPage.waitForExportStatus(exportId, status);
  }

  /** @description Clicks the Downloads table refresh button. */
  async $tf_clickDownloadsRefetch() {
    await this.logsPage.clickDownloadsRefetch();
  }

  /** @description Asserts the download button for the given export id is disabled (export not yet completed). */
  async $tf_assertDownloadButtonDisabled({ exportId }: { exportId: string }) {
    await this.logsPage.assertDownloadButtonDisabled(exportId);
  }

  /** @description Finds an expired export in Downloads and asserts its download button is disabled. */
  async $tf_assertExpiredExportDownloadDisabled() {
    await this.logsPage.assertExpiredExportDownloadDisabled();
  }

  /** @description Clicks the download button for a completed export and asserts the browser download event fires with a filename. */
  async $tf_downloadExport({ exportId }: { exportId: string }) {
    await this.logsPage.downloadExport(exportId);
  }

  /** @description Asserts a view-only Logs user can see Records but not Downloads or Export controls. */
  async $tf_assertViewOnlyAccess() {
    await this.logsPage.assertViewOnlyAccess();
  }

  /** @description Opens the forbidden Logs export route and asserts the real 404 state is shown without the export form. */
  async $tf_openForbiddenExportAndAssertNotFound() {
    await this.logsPage.openForbiddenExportAndAssertNotFound();
  }

  /** @description Types a term into the pinned records search input (debounced 300ms in the app). */
  async $tf_searchRecords({ term }: { term: string }) {
    await this.logsPage.searchRecords(term);
  }

  /** @description Polls for an audit record matching section, action, severity, and result, then returns its actor for combined-filter assertions. Use saveAs to reference it later. */
  async $tf_getMatchingRecordExecutedBy({
    section,
    action,
    severity,
    result,
  }: {
    section: string;
    action: string;
    severity: string;
    result: string;
  }) {
    return this.logsPage.getMatchingRecordExecutedBy(section, action, severity, result);
  }

  /** @description Opens the advanced-filter picker and asserts Section, Action, Severity, and Result are available. */
  async $tf_assertAdvancedFiltersAvailable() {
    await this.logsPage.assertAdvancedFiltersAvailable();
  }

  /** @description Enables one generated advanced filter by key and applies the selection. */
  async $tf_enableAdvancedFilter({
    filter,
  }: {
    filter: 'section' | 'action' | 'severity' | 'result';
  }) {
    await this.logsPage.enableAdvancedFilter(filter);
  }

  /** @description Opens the records Section filter combobox (must already be enabled via enableAdvancedFilter) and selects the given section option. */
  async $tf_selectSectionFilterOption({ section }: { section: string }) {
    await this.logsPage.selectSectionFilterOption(section);
  }

  /** @description Opens the records Severity filter and selects the requested value. */
  async $tf_selectSeverityFilterOption({ severity }: { severity: string }) {
    await this.logsPage.selectSeverityFilterOption(severity);
  }

  /** @description Opens the records Action filter and selects the requested audit event. */
  async $tf_selectActionFilterOption({ action }: { action: string }) {
    await this.logsPage.selectActionFilterOption(action);
  }

  /** @description Opens the records Result filter and selects the requested value. */
  async $tf_selectResultFilterOption({ result }: { result: string }) {
    await this.logsPage.selectResultFilterOption(result);
  }

  /** @description Opens the "Agregar filtro" picker and clicks "Limpiar" to reset search/date/advanced filters to their defaults. */
  async $tf_clearAllFilters() {
    await this.logsPage.clearAllFilters();
  }

  /** @description Expands the first audit-log row and asserts that the Details tab is selected. */
  async $tf_expandFirstRecordAndAssertDetails() {
    await this.logsPage.expandFirstRecordAndAssertDetails();
  }

  /** @description Opens the JSON tab of the expanded row, searches for term, and asserts the JSON still contains it. */
  async $tf_openJsonAndSearch({ term }: { term: string }) {
    await this.logsPage.openJsonAndSearch(term);
  }

  /** @description Copies the first row's full entry, asserts the temporary copied state, and validates the clipboard contains JSON. */
  async $tf_copyFirstRecordEntry() {
    await this.logsPage.copyFirstRecordEntry();
  }

  /** @description Copies the first row's IP, asserts the temporary copied state, and validates the clipboard value. */
  async $tf_copyFirstRecordIp() {
    await this.logsPage.copyFirstRecordIp();
  }

  /** @description Collapses the first expanded audit-log row and asserts its details are hidden. */
  async $tf_collapseFirstRecord() {
    await this.logsPage.collapseFirstRecord();
  }
}
