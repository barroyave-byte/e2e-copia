import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';

test.describe('@regression Admin error management: bulk retry/decline', () => {
  test(
    '@ADM-T892 Admin - Error Management - Bulk retry/decline selected PSP errors',
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
          {
            action: 'admin.errorManagement.selectFirstRows',
            params: { count: 2 },
            saveAs: 'rowIds',
          },
          {
            action: 'admin.errorManagement.assertActionHeaderVisibleWithCount',
            params: { count: 2 },
          },
          { action: 'admin.errorManagement.chooseBulkAction', params: { action: 'decline' } },
          { action: 'admin.errorManagement.clickApplyBulkAction' },
          { action: 'admin.errorManagement.confirmBulkApply' },
          { action: 'admin.errorManagement.assertSuccessToastVisible' },
          {
            action: 'admin.errorManagement.assertRowsShowAction',
            params: { rowIds: ref('rowIds'), action: 'decline' },
          },
          { action: 'admin.errorManagement.assertActionHeaderHidden' },
          {
            action: 'admin.errorManagement.assertRowCheckboxesUnchecked',
            params: { rowIds: ref('rowIds') },
          },
        ],
      });
    }
  );
});
