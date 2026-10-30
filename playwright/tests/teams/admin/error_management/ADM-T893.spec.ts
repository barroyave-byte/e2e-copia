import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';

test.describe('@regression Admin error management: change and reset an individual action', () => {
  test(
    "@ADM-T893 Admin - Error Management - Change and reset an individual PSP error's action",
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
          { action: 'admin.errorManagement.pickRowWithoutOverride', saveAs: 'rowId' },
          {
            action: 'admin.errorManagement.assertRowHasNoOverrideControls',
            params: { rowId: ref('rowId') },
          },
          {
            action: 'admin.errorManagement.getRowAction',
            params: { rowId: ref('rowId') },
            saveAs: 'defaultAction',
          },
          {
            action: 'admin.errorManagement.changeRowActionToOpposite',
            params: { rowId: ref('rowId') },
            saveAs: 'newAction',
          },
          { action: 'admin.errorManagement.assertChangeConfirmDialogVisible' },
          { action: 'admin.errorManagement.confirmActionModal' },
          { action: 'admin.errorManagement.assertSuccessToastVisible' },
          {
            action: 'admin.errorManagement.assertRowShowsAction',
            params: { rowId: ref('rowId'), action: ref('newAction') },
          },
          { action: 'admin.errorManagement.resetRowToDefault', params: { rowId: ref('rowId') } },
          { action: 'admin.errorManagement.assertResetConfirmDialogVisible' },
          { action: 'admin.errorManagement.confirmActionModal' },
          { action: 'admin.errorManagement.assertSuccessToastVisible' },
          {
            action: 'admin.errorManagement.assertRowResetControlsHidden',
            params: { rowId: ref('rowId') },
          },
          {
            action: 'admin.errorManagement.assertRowShowsAction',
            params: { rowId: ref('rowId'), action: ref('defaultAction') },
          },
        ],
      });
    }
  );
});
