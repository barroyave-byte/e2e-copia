import { expect } from '@playwright/test';
import { Context, FrameworkPlugin } from '../interface';
import { AdminReportsPage } from '@pages/admin/adminReportsPage';

export class PluginAdminReports extends FrameworkPlugin {
  pluginBaseName = 'admin.reports';

  reportsPage!: AdminReportsPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.reportsPage = new AdminReportsPage(context.page);
  }

  /** @description Waits for the Downloads/Reports page URL and asserts the reports title is visible. */
  async $tf_assertTitleVisible() {
    await this.reportsPage.assertReportsTitleVisible();
  }

  /** @description Opens the report details row matching the given file name. */
  async $tf_openReportDetails({ fileName }: { fileName: string }) {
    await this.reportsPage.openReportDetails(fileName);
  }

  /** @description Asserts the report detail's origin text matches the expected pattern. */
  async $tf_assertOriginText({ expected }: { expected: RegExp | string }) {
    await expect(
      this.reportsPage.adhocReportDetailOrigin,
      'The report origin should be Subscriptions'
    ).toContainText(expected);
  }

  /** @description Asserts the report detail's type text matches the expected pattern for the given report type. */
  async $tf_assertTypeText({
    expected,
    reportType,
  }: {
    expected: RegExp | string;
    reportType: string;
  }) {
    await expect(
      this.reportsPage.adhocReportDetailType,
      `The report details should show type ${reportType}`
    ).toContainText(expected);
  }

  /** @description Asserts the report detail's filters section contains the given Plan ID. */
  async $tf_assertFiltersContainPlanId({ planId }: { planId: string }) {
    await expect(
      this.reportsPage.adhocReportFilters,
      `The report details should contain Plan ID ${planId}`
    ).toContainText(new RegExp(planId, 'i'));
  }

  /** @description Asserts the report detail's filters section contains the active status filter. */
  async $tf_assertFiltersContainActiveStatus() {
    await expect(
      this.reportsPage.adhocReportFilters,
      'The report details should contain the active status filter'
    ).toContainText(/activo|active/i);
  }

  /** @description Asserts the selected report columns section is visible. */
  async $tf_assertColumnsVisible() {
    await expect(
      this.reportsPage.adhocReportColumns,
      'The selected report columns should be visible'
    ).toBeVisible();
  }

  /** @description Asserts the total count of selected report columns is at least the given minimum. */
  async $tf_assertSelectedColumnsCountAtLeast({ minimum }: { minimum: number }) {
    await this.reportsPage.assertSelectedColumnsCountAtLeast(minimum);
  }
}
