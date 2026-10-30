import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';

test.describe('@regression Admin error management: search and filter PSP errors', () => {
  test(
    '@ADM-T895 Admin - Error Management - Search and filter PSP errors',
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
          { action: 'admin.errorManagement.getTotalCount', saveAs: 'totalBoth' },
          {
            action: 'admin.errorManagement.selectProcessorFilterByName',
            params: { name: 'Stripe' },
          },
          {
            action: 'admin.errorManagement.assertTotalCountLessThan',
            params: { max: ref('totalBoth') },
          },
          {
            action: 'admin.errorManagement.selectProcessorFilterByName',
            params: { name: 'Amex' },
          },
          {
            action: 'admin.errorManagement.assertTotalCountEquals',
            params: { expected: ref('totalBoth') },
          },
          {
            action: 'admin.errorManagement.getFirstRowMessageSubstring',
            saveAs: 'messageSubstring',
          },
          {
            action: 'admin.errorManagement.searchByText',
            params: { term: ref('messageSubstring') },
          },
          { action: 'admin.errorManagement.assertRowCountAtLeast', params: { min: 1 } },
          { action: 'admin.errorManagement.assertRowCountAtMost', params: { max: 10 } },
          { action: 'admin.errorManagement.clearSearch' },
          {
            action: 'admin.errorManagement.assertTotalCountEquals',
            params: { expected: ref('totalBoth') },
          },
          { action: 'admin.errorManagement.selectActionableFilter', params: { value: 'retry' } },
          {
            action: 'admin.errorManagement.assertAllVisibleRowsHaveAction',
            params: { action: 'retry' },
          },
          { action: 'admin.errorManagement.selectActionableFilter', params: { value: 'all' } },
        ],
      });
    }
  );
});
