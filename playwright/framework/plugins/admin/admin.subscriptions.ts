import { expect } from '@playwright/test';
import { Context, FrameworkPlugin } from '../interface';
import { AdminSubscriptionsPage } from '@pages/admin/subscriptions/adminSubscriptionsPage';

export class PluginAdminSubscriptions extends FrameworkPlugin {
  pluginBaseName = 'admin.subscriptions';

  subscriptionsPage!: AdminSubscriptionsPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.subscriptionsPage = new AdminSubscriptionsPage(context.page);
  }

  /** @description Clicks the subscriptions tab to display the subscriptions list. */
  async $tf_clickTabSubscriptions() {
    await this.subscriptionsPage.clickTabSubscriptions();
  }

  /** @description Clicks the plans tab to display the subscription plans list. */
  async $tf_clickTabPlans() {
    await this.subscriptionsPage.clickTabPlans();
  }

  /** @description Clicks the create plan button to navigate to the plan creation form. */
  async $tf_clickButtonCreatePlan() {
    await this.subscriptionsPage.clickButtonCreatePlan();
  }

  /** @description Asserts that all expected column headers of the subscriptions table are visible. */
  async $tf_assertSubscriptionsTable() {
    await this.subscriptionsPage.assertSubscriptionsTable();
  }

  /** @description Asserts that all expected column headers of the subscription plans table are visible. */
  async $tf_assertPlanTable() {
    await this.subscriptionsPage.assertPlanTable();
  }

  /** @description Clicks the dropdown icon on the first subscription row and selects the view details option. */
  async $tf_clickSubscriptionDetailsFromTable() {
    await this.subscriptionsPage.clickAtSubscriptionDetailsFromTable();
  }

  /** @description Asserts that the actionables button is visible on the subscription details page. */
  async $tf_assertSubscriptionActionableInDetails() {
    await this.subscriptionsPage.assertSubscriptionActionableInDetails();
  }

  /** @description Expands the actionables menu on the subscription details page and clicks the pause button. */
  async $tf_clickSubscriptionPause() {
    await this.subscriptionsPage.clickSubscriptionActionablePause();
  }

  /** @description Expands the actionables menu on the subscription details page and clicks the reactivate button. */
  async $tf_clickSubscriptionReactivate() {
    await this.subscriptionsPage.clickSubscriptionActionableReactivate();
  }

  /** @description Expands the actionables menu on the subscription details page and clicks the cancel button. */
  async $tf_clickSubscriptionCancel() {
    await this.subscriptionsPage.clickSubscriptionActionableCancel();
  }

  /** @description Opens the export subscriptions dialog and fills in the report name. */
  async $tf_openExport({ reportName }: { reportName: string }) {
    await this.subscriptionsPage.openExportSubscriptions(reportName);
  }

  /**
   * Selects the report type in the export dialog and waits for the fields lookup request
   * (GET .../merchants/{merchantId}/reports/fields?report_type={reportType}) to come back 200,
   * so the test asserts the network call instead of just the UI selection.
   *
   * @description Selects the export report type and asserts the report fields request succeeds.
   */
  async $tf_chooseReportType({
    reportType,
    merchantId,
  }: {
    reportType: string;
    merchantId: string;
  }) {
    const reportFieldsResponse = this.context.page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes(`/merchants/${merchantId}/reports/fields`) &&
        new URL(response.url()).searchParams.get('report_type') === reportType
    );

    await this.subscriptionsPage.chooseExportReportType(reportType);

    const fieldsResponse = await reportFieldsResponse;
    expect(
      fieldsResponse.status(),
      `Expected report fields for ${reportType} (200), got ${fieldsResponse.status()}.`
    ).toBe(200);
  }

  /** @description Asserts that the export columns selector is visible for the given report type. */
  async $tf_assertColumnsSelectorVisible({ reportType }: { reportType: string }) {
    await expect(
      this.subscriptionsPage.checkboxExportAllColumns,
      `The columns selector should be visible for ${reportType}`
    ).toBeVisible();
  }

  /** @description Asserts that the Export button is enabled for the given report type. */
  async $tf_assertExportButtonEnabled({ reportType }: { reportType: string }) {
    await expect(
      this.subscriptionsPage.buttonExportSubscriptions,
      `The Export button should be enabled for ${reportType}`
    ).toBeEnabled();
  }

  /** @description Selects the "active" status filter in the export dialog. */
  async $tf_selectActiveStatus() {
    await this.subscriptionsPage.selectActiveExportStatus();
  }

  /** @description Fills the Plan ID filter in the export dialog. */
  async $tf_fillPlanId({ planId }: { planId: string }) {
    await this.subscriptionsPage.fillExportPlanId(planId);
  }

  /** @description Selects the created-at date range in the export dialog. */
  async $tf_selectCreatedAtRange({ startDate, endDate }: { startDate: Date; endDate: Date }) {
    await this.subscriptionsPage.selectExportCreatedAtRange(startDate, endDate);
  }

  /** @description Selects all available columns in the export dialog. */
  async $tf_selectAllColumns() {
    await this.subscriptionsPage.selectAllExportColumns();
  }

  /**
   * Clicks the Export button and waits for the POST .../v2/merchants/reports/adhoc request to
   * come back 202, asserting its JSON payload (report_type, fields count, and — when
   * `applyPlanFilters` is set — the plan_id/status filters) instead of leaving the raw
   * `page.waitForResponse` plumbing in the spec.
   *
   * @description Submits the export and asserts the accepted request and its payload.
   */
  async $tf_submitExport({
    reportType,
    applyPlanFilters,
    planId,
  }: {
    reportType: string;
    applyPlanFilters?: boolean;
    planId?: string;
  }) {
    const exportResponse = this.context.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/v2/merchants/reports/adhoc')
    );

    await this.subscriptionsPage.buttonExportSubscriptions.click();

    const response = await exportResponse;
    expect(response.status(), `The ${reportType} export request should be accepted`).toBe(202);

    const payload = response.request().postDataJSON() as {
      report_type: string;
      fields: string[];
      filters: Record<string, string | string[]>;
    };
    expect(payload.report_type, `The export payload should use report type ${reportType}`).toBe(
      reportType
    );
    expect(
      payload.fields.length,
      `The ${reportType} export should contain at least three fields`
    ).toBeGreaterThanOrEqual(3);

    if (applyPlanFilters) {
      expect(
        payload.filters,
        'The export payload should contain the created Plan ID'
      ).toMatchObject({
        plan_id: planId,
      });
      expect(
        payload.filters.status,
        'The export payload should contain the active status filter'
      ).toContain('active');
    }

    return payload;
  }
}
