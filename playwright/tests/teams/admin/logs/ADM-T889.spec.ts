import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { adminLogsRecordsFlow } from './adminLogsRecordsFlow';

test.describe('@regression Admin audit logs: record row detail', () => {
  test(
    '@ADM-T889 Admin - Audit Logs - Expand a record row to view its detail and copy actions',
    { tag: ['@admin', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          ...adminLogsRecordsFlow.flowSteps(),
          { action: 'admin.logs.assertRecordsTableHasRows', params: { minRows: 1 } },
          { action: 'admin.logs.expandFirstRecordAndAssertDetails' },
          {
            action: 'admin.logs.openJsonAndSearch',
            params: { term: 'merchant_id' },
          },
          { action: 'admin.logs.copyFirstRecordEntry' },
          { action: 'admin.logs.copyFirstRecordIp' },
          { action: 'admin.logs.collapseFirstRecord' },
        ],
      });
    }
  );
});
