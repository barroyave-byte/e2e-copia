import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { adminLogsRecordsFlow } from './adminLogsRecordsFlow';

/**
 * Reads the audit history of a designated E2E merchant, which the
 * roles-and-permissions suite keeps populated with audited USERS/AUTH events.
 * Environment-specific merchant selection follows the roles-and-permissions
 * suite (ADM-T539 and siblings).
 */
test.describe('@regression Admin audit logs: filter records by date range', () => {
  test(
    '@ADM-T884 Admin - Audit Logs - Filter audit log records by date range',
    { tag: ['@admin', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          ...adminLogsRecordsFlow.flowSteps(),
          {
            action: 'admin.logs.assertRecordsTableHasRows',
            params: { minRows: 1 },
            stepName: 'Verify the unfiltered records list has records',
          },
          {
            action: 'admin.logs.assertRecordsDateBounds',
            stepName: 'Verify dates older than 90 days and future dates are disabled',
          },
          {
            action: 'admin.logs.applyDateRangeContainingAvailableRecord',
            stepName: 'Select a date range containing an available audit record',
          },
          {
            action: 'admin.logs.assertDateRangeIsDisplayed',
            stepName: 'Verify the date filter displays the selected range',
          },
          {
            action: 'admin.logs.assertRecordsColumns',
            stepName: 'Verify the filtered records table keeps its fixed columns',
          },
          {
            action: 'admin.logs.clearDateRangeAndAssertRestored',
            stepName: 'Clear the date range and verify unfiltered records are restored',
          },
        ],
      });
    }
  );
});
