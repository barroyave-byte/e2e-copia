import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import { adminLogsRecordsFlow } from './adminLogsRecordsFlow';

/**
 * Environment-specific merchant selection follows the roles-and-permissions
 * suite (ADM-T539 and siblings) — same pattern as ADM-T883/884/885.
 */
const RANGE_FROM_DAYS_AGO = 7;
const DOWNLOADABLE_STATUS = 'completed';

test.describe('@regression Admin audit logs: download an export file', () => {
  test(
    '@ADM-T886 Admin - Audit Logs - Download an audit log export file',
    { tag: ['@admin', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          ...adminLogsRecordsFlow.flowSteps(),
          {
            action: 'admin.logs.goToDownloads',
            stepName: 'Open Downloads and remember its first-page cursor',
          },
          {
            action: 'admin.logs.goToNextDownloadsPage',
            stepName: 'Open the older exports page',
          },
          {
            action: 'admin.logs.assertExpiredExportDownloadDisabled',
            stepName: 'Verify an expired export cannot be downloaded',
          },
          {
            action: 'admin.logs.goToRecords',
            stepName: 'Return to Records',
          },
          {
            action: 'admin.logs.goToExportPage',
            stepName: 'Open the Export page to create a new export',
          },
          {
            action: 'admin.logs.applyExportDateRange',
            params: { fromDaysAgo: RANGE_FROM_DAYS_AGO, toDaysAgo: 0 },
            stepName: 'Select a date range inside the last 365 days',
          },
          {
            action: 'admin.logs.submitExportAndAssertNavigation',
            saveAs: 'exportId',
            stepName: 'Submit the export and land on the Downloads tab',
          },
          {
            action: 'admin.logs.assertDownloadButtonDisabled',
            params: { exportId: ref('exportId') },
            stepName: 'Verify the download button is disabled while the export is not completed',
          },
          {
            action: 'admin.logs.waitForExportStatus',
            params: { exportId: ref('exportId'), status: DOWNLOADABLE_STATUS },
            stepName: 'Wait for the export to reach the completed status',
          },
          {
            action: 'admin.logs.downloadExport',
            params: { exportId: ref('exportId') },
            stepName: 'Download the completed export and verify the browser download event fires',
          },
        ],
      });
    }
  );
});
