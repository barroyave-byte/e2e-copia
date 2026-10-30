import { Context, FrameworkPlugin } from '../interface';
import { AdminMetricsPage } from '@pages/admin/metrics/adminMetricsPage';
import { AdminReportsPage } from '@pages/admin/adminReportsPage';
import type { MetricsType } from '@pages/admin/metrics/types';
import type { ScheduleReportType } from '@pages/admin/constants/commons';

export class PluginAdminMetrics extends FrameworkPlugin {
  pluginBaseName = 'admin.metrics';

  metricsPage!: AdminMetricsPage;
  reportsPage!: AdminReportsPage;
  private selectedDate = '';

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.metricsPage = new AdminMetricsPage(context.page);
    this.reportsPage = new AdminReportsPage(context.page);
  }

  /** @description Asserts that the current URL pathname is /metrics, confirming the metrics page is active. */
  async $tf_assertMetricsPage() {
    await this.metricsPage.assertMetricsPageAsCurrentPage();
  }

  /** @description Opens the date picker, selects today as both the start and end date, and applies the filter. */
  async $tf_selectPeriodFilter() {
    this.selectedDate = await this.metricsPage.selectsAPeriodFilter();
  }

  /** @description Asserts that all principal metrics elements are visible: period filter, temporality filter, clear button, and all metric iframes. */
  async $tf_assertPrincipalMetrics() {
    await this.metricsPage.assertPrincipalMetrics();
  }

  /** @description Asserts that the GMV orders metrics iframe src contains the merchantId parameter. */
  async $tf_assertGmvOrdersMetricsHasValidURL() {
    await this.metricsPage.assertGmvOrdersMetricsHasValidURL();
  }

  /** @description Asserts that the GMV orders metrics iframe src contains the selected date as both dateFrom and dateTo. */
  async $tf_assertGmvOrdersMetricsHasProperDateRange() {
    await this.metricsPage.assertGmvOrdersMetricsHasProperDateRange(this.selectedDate);
  }

  /** @description Clicks the specified metrics tab (sales, acceptanceRate, paymentStrategy, or reconciliation). */
  async $tf_selectMetricsTab(params: { metricsType: MetricsType }) {
    await this.metricsPage.selectMetricsTab(params.metricsType);
  }

  /** @description Asserts that the specified metrics tab has aria-selected="true", indicating it is the active tab. */
  async $tf_assertMetricsTabSelected(params: { metricsType: MetricsType }) {
    await this.metricsPage.assertMetricsTabIsSelected(params.metricsType);
  }

  /** @description Polls the reports file list GET request (reloading and re-selecting the page size between attempts) until a file with status SUCCESS and version v2 is available, and stores it for later use. Assumes the given page size was already selected before calling this action. */
  async $tf_waitForAvailableReportFile(params: { pageSize?: string }) {
    await this.reportsPage.waitForAvailableReportFile(params.pageSize ?? '100');
  }

  /** @description Clicks the schedule reports type button to open the dropdown menu of report types. */
  async $tf_clickOpenScheduleReportTypes() {
    await this.reportsPage.clickToOpenScheduleReportTypes();
  }

  /** @description Clicks the specific report type option to navigate to the schedule report creation form. */
  async $tf_goToScheduleReportCreationForm(params: { reportType: ScheduleReportType }) {
    await this.reportsPage.goToScheduleReportCreationForm(params.reportType);
  }

  /** @description Clicks the download button for the specified report file ID in the reports table. */
  async $tf_downloadReport(params: { fileId: string }) {
    await this.reportsPage.downloadReport(params.fileId);
  }

  /** @description Clicks the pagination size selector and selects the specified page size option. */
  async $tf_selectPaginationOption(params: { option: string }) {
    await this.reportsPage.selectPaginationOption(params.option);
  }

  /** @description Asserts that the current page URL is the reports downloads page. */
  async $tf_assertPresenceInReports() {
    await this.reportsPage.assertPresenceInReports();
  }

  /** @description Asserts that the reports table has at least one visible row. */
  async $tf_assertTableHaveAtLeastOneRow() {
    await this.reportsPage.assertTableHaveAtLeastOneRow();
  }

  /** @description Asserts that the go-to-reports modal confirmation button is visible. */
  async $tf_assertModalGoToReportIsVisible() {
    await this.reportsPage.assertModalGoToReportIsVisible();
  }
}
