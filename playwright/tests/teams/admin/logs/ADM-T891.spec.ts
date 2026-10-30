import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { adminLogsRecordsFlow } from './adminLogsRecordsFlow';

test.describe('@regression Admin audit logs: downloads navigation and filter carryover', () => {
  test(
    '@ADM-T891 Admin - Audit Logs - Downloads pagination, copy export name and cancel with filter carryover',
    { tag: ['@admin', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          ...adminLogsRecordsFlow.flowSteps(),
          { action: 'admin.logs.stubDownloadsPagination' },
          { action: 'admin.logs.goToDownloads' },
          { action: 'admin.logs.copyFirstExportName' },
          { action: 'admin.logs.goToExportPage' },
          {
            action: 'admin.logs.selectExportSection',
            params: { section: 'USERS' },
          },
          {
            action: 'admin.logs.cancelExportAndAssertSectionCarryover',
            params: { section: 'USERS' },
          },
          { action: 'admin.logs.goToDownloads' },
          { action: 'admin.logs.goToNextDownloadsPage' },
        ],
      });
    }
  );
});
