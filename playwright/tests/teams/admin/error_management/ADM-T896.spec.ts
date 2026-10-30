import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';

test.describe('@regression Admin error management: AVS configuration history', () => {
  test(
    '@ADM-T896 Admin - Error Management - View AVS configuration change history',
    { tag: ['@admin', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          { action: 'setup.merchant.basicSetup', params: { country: 'MX' }, saveAs: 'merchant' },
          {
            action: 'setup.processor.createProcessor',
            params: { processorConfig: processorsConfig.amexProcessor },
          },
          { action: 'admin.navigate.goToAdminPage' },
          {
            action: 'admin.auth.setMerchantSession',
            params: { merchantId: ref('merchant').at('merchantId') },
          },
          { action: 'admin.navigate.goToErrorManagement' },
          { action: 'admin.avs.clickAvsTab' },
          { action: 'admin.avs.activateAvsToggle' },
          { action: 'admin.avs.selectAvsCodeCheckboxes' },
          { action: 'admin.avs.selectConfigurationCheckboxes' },
          { action: 'admin.avs.saveConfiguration' },
          { action: 'admin.avs.verifySuccessToast' },
          { action: 'admin.avs.openHistory' },
          { action: 'admin.avs.assertHistoryDialogVisible' },
          { action: 'admin.avs.assertFirstHistoryEntryHasContent' },
          { action: 'admin.avs.closeHistory' },
        ],
      });
    }
  );
});
