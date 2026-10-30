import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';

test.describe('@regression Admin error management: PSP errors pagination and refresh', () => {
  test(
    '@ADM-T894 Admin - Error Management - View PSP errors table with total count, pagination and refresh',
    { tag: ['@admin', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          { action: 'setup.merchant.basicSetup', params: { country: 'MX' }, saveAs: 'merchant' },
          {
            action: 'setup.processor.createProcessor',
            params: { processorConfig: processorsConfig.stripeProcessor },
          },
          { action: 'admin.navigate.goToAdminPage' },
          {
            action: 'admin.auth.setMerchantSession',
            params: { merchantId: ref('merchant').at('merchantId') },
          },
          { action: 'admin.navigate.goToErrorManagement' },
          { action: 'admin.errorManagement.getTotalCount', saveAs: 'total' },
          { action: 'admin.errorManagement.assertPreviousPageDisabled' },
          { action: 'admin.errorManagement.clickNextPage' },
          { action: 'admin.errorManagement.assertPreviousPageEnabled' },
          { action: 'admin.errorManagement.selectPageSize', params: { size: 50 } },
          {
            action: 'admin.errorManagement.assertRowCountMatchesPageSize',
            params: { pageSize: 50, total: ref('total') },
          },
          { action: 'admin.errorManagement.clickRefresh' },
          {
            action: 'admin.errorManagement.assertTotalCountEquals',
            params: { expected: ref('total') },
          },
        ],
      });
    }
  );
});
