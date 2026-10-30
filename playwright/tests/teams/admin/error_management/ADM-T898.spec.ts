import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';

// Fixed, dedicated merchant — the checkout-message column is gated behind the
// CHECKOUT_MESSAGE_VISIBILITY_MERCHANTS dynamic config allowlist, which a freshly
// created merchant is never part of. This merchant was allowlisted specifically
// for this suite and already has a connected payment processor.
const CHECKOUT_MESSAGE_MERCHANT_ID = '3021fd01-c254-4c65-96a3-d5571b62cd18';

test.describe('@regression Admin error management: bulk-edit checkout message', () => {
  test(
    '@ADM-T898 Admin - Error Management - Bulk-edit checkout message for selected PSP errors',
    { tag: ['@admin', '@team_admin'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          { action: 'admin.navigate.goToAdminPage' },
          {
            action: 'admin.auth.setMerchantSession',
            params: { merchantId: CHECKOUT_MESSAGE_MERCHANT_ID },
          },
          { action: 'admin.navigate.goToErrorManagement' },
          { action: 'admin.errorManagement.assertCheckoutMessageColumnVisible' },
          {
            action: 'admin.errorManagement.selectFirstRows',
            // offset avoids row 0, which ADM-T897 edits concurrently on this same shared merchant
            params: { count: 2, offset: 2 },
            saveAs: 'rowIds',
          },
          { action: 'admin.errorManagement.clickBulkEditMessage' },
          {
            action: 'admin.errorManagement.selectBulkCheckoutMessageLanguageTab',
            params: { code: 'es' },
          },
          {
            action: 'admin.errorManagement.typeBulkCheckoutMessage',
            params: { code: 'es', text: 'Mensaje bulk E2E ADM-T898' },
          },
          { action: 'admin.errorManagement.applyBulkCheckoutMessage' },
          { action: 'admin.errorManagement.assertSuccessToastVisible' },
          { action: 'admin.errorManagement.assertActionHeaderHidden' },
          {
            action: 'admin.errorManagement.clickEditCheckoutMessage',
            params: { rowId: ref('rowIds').at('0') },
          },
          {
            action: 'admin.errorManagement.selectCheckoutMessageLanguageTab',
            params: { code: 'es' },
          },
          {
            action: 'admin.errorManagement.assertCheckoutMessageTextareaValue',
            params: { code: 'es', expected: 'Mensaje bulk E2E ADM-T898' },
          },
          { action: 'admin.errorManagement.cancelCheckoutMessage' },
          {
            action: 'admin.errorManagement.clickEditCheckoutMessage',
            params: { rowId: ref('rowIds').at('1') },
          },
          {
            action: 'admin.errorManagement.selectCheckoutMessageLanguageTab',
            params: { code: 'es' },
          },
          {
            action: 'admin.errorManagement.assertCheckoutMessageTextareaValue',
            params: { code: 'es', expected: 'Mensaje bulk E2E ADM-T898' },
          },
          { action: 'admin.errorManagement.cancelCheckoutMessage' },
        ],
      });
    }
  );
});
