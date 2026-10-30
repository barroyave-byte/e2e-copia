import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { adminLogsRecordsFlow } from './adminLogsRecordsFlow';

test.describe('@regression Admin audit logs: export request error', () => {
  test(
    '@ADM-T890 Admin - Audit Logs - Export request error keeps the form intact',
    { tag: ['@admin', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          ...adminLogsRecordsFlow.flowSteps(),
          { action: 'admin.logs.goToExportPage' },
          {
            action: 'admin.logs.applyExportDateRange',
            params: { fromDaysAgo: 7, toDaysAgo: 0 },
          },
          {
            action: 'admin.logs.selectExportSection',
            params: { section: 'USERS' },
          },
          { action: 'admin.logs.submitExportAndAssertError' },
          {
            action: 'admin.logs.assertExportFormPreserved',
            params: { section: 'USERS' },
          },
        ],
      });
    }
  );
});
