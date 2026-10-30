import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import { adminLogsRecordsFlow } from './adminLogsRecordsFlow';

/**
 * Environment-specific merchant selection follows the roles-and-permissions
 * suite (ADM-T539 and siblings) — same pattern as ADM-T883/ADM-T884.
 */
/** Well inside the 365-day window the export date range allows. */
const RANGE_FROM_DAYS_AGO = 7;
const EXPORT_SECTION = 'USERS';

test.describe('@regression Admin audit logs: create an export', () => {
  test(
    '@ADM-T885 Admin - Audit Logs - Create an audit log export',
    { tag: ['@admin', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          ...adminLogsRecordsFlow.flowSteps(),
          {
            action: 'admin.logs.goToExportPage',
            stepName: 'Open the Export page from the Logs header',
          },
          {
            action: 'admin.logs.assertExportSubmitIsDisabled',
            stepName: 'Verify the submit button starts disabled',
          },
          {
            action: 'admin.logs.applyExportDateRange',
            params: { fromDaysAgo: RANGE_FROM_DAYS_AGO, toDaysAgo: 0 },
            stepName: 'Select a date range inside the last 365 days',
          },
          {
            action: 'admin.logs.selectExportSection',
            params: { section: EXPORT_SECTION },
            stepName: 'Select a section in the optional section filter',
          },
          {
            action: 'admin.logs.submitExportAndAssertNavigation',
            saveAs: 'exportId',
            stepName: 'Submit the export and verify navigation to the Downloads tab',
          },
          {
            action: 'admin.logs.assertExportListed',
            params: { exportId: ref('exportId') },
            stepName: 'Verify the newly requested export row shows its name, date and status',
          },
        ],
      });
    }
  );
});
