import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { adminLogsRecordsFlow } from './adminLogsRecordsFlow';

/**
 * Audit logs is a read-only history view. A freshly created merchant has no
 * audit records, and admin actions performed by the superadmin session are not
 * retrievably audited in staging (verified: configuring a connection produced
 * no audit-log entry even after ~10 min, with or without a merchant filter).
 * This test reads the audit history of a designated E2E merchant, which the
 * roles-and-permissions suite keeps populated with audited USERS/AUTH events
 * (create user/role, update role permissions).
 *
 * Environment-specific merchant selection follows the same pattern as the
 * roles-and-permissions suite (ADM-T539 and siblings).
 */
test.describe('@regression Admin audit logs: records list', () => {
  test(
    '@ADM-T883 Admin - Audit Logs - View audit log records list',
    { tag: ['@admin', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          ...adminLogsRecordsFlow.flowSteps(),
          {
            action: 'admin.logs.assertRecordsColumns',
            stepName: 'Verify the fixed columns of the records table',
          },
          {
            action: 'admin.logs.assertRecordsTableHasRows',
            params: { minRows: 1 },
            stepName: 'Verify the table lists at least one audit log record',
          },
          {
            action: 'admin.logs.assertTotalCountVisible',
            stepName: 'Verify the total record count is displayed',
          },
          {
            action: 'admin.logs.changePageSize',
            params: { pageSize: 25 },
            stepName: 'Change the page size and verify the table respects it',
          },
          {
            action: 'admin.logs.clickRefetch',
            stepName: 'Refetch the records table',
          },
          {
            action: 'admin.logs.assertRecordsTableHasRows',
            params: { minRows: 1 },
            stepName: 'Verify the records are displayed again after refetch',
          },
        ],
      });
    }
  );
});
