import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';

// Fixed, dedicated merchant — the checkout-message column is gated behind the
// CHECKOUT_MESSAGE_VISIBILITY_MERCHANTS dynamic config allowlist, which a freshly
// created merchant is never part of. This merchant was allowlisted specifically
// for this suite and already has a connected payment processor.
const CHECKOUT_MESSAGE_MERCHANT_ID = '3021fd01-c254-4c65-96a3-d5571b62cd18';

test.describe('@regression Admin error management: edit individual checkout message', () => {
  test(
    '@ADM-T897 Admin - Error Management - Edit checkout message for an individual PSP error',
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
          { action: 'admin.errorManagement.pickFirstCheckoutMessageRow', saveAs: 'rowId' },
          {
            action: 'admin.errorManagement.clickEditCheckoutMessage',
            params: { rowId: ref('rowId') },
          },
          {
            action: 'admin.errorManagement.selectCheckoutMessageLanguageTab',
            params: { code: 'es' },
          },
          {
            action: 'admin.errorManagement.typeCheckoutMessage',
            params: { code: 'es', text: 'Mensaje E2E ADM-T897' },
          },
          { action: 'admin.errorManagement.assertCheckoutMessageSaveEnabled' },
          {
            action: 'admin.errorManagement.assertCheckoutMessageResetEnabled',
            params: { code: 'es' },
          },
          { action: 'admin.errorManagement.saveCheckoutMessage' },
          { action: 'admin.errorManagement.assertSuccessToastVisible' },
          {
            action: 'admin.errorManagement.clickEditCheckoutMessage',
            params: { rowId: ref('rowId') },
          },
          {
            action: 'admin.errorManagement.selectCheckoutMessageLanguageTab',
            params: { code: 'es' },
          },
          {
            action: 'admin.errorManagement.assertCheckoutMessageTextareaValue',
            params: { code: 'es', expected: 'Mensaje E2E ADM-T897' },
          },
          {
            action: 'admin.errorManagement.assertCheckoutMessageResetEnabled',
            params: { code: 'es' },
          },
          { action: 'admin.errorManagement.clickResetCheckoutMessage', params: { code: 'es' } },
          {
            action: 'admin.errorManagement.assertCheckoutMessageTextareaEmpty',
            params: { code: 'es' },
          },
          {
            action: 'admin.errorManagement.assertCheckoutMessageResetDisabled',
            params: { code: 'es' },
          },
          { action: 'admin.errorManagement.saveCheckoutMessage' },
          { action: 'admin.errorManagement.assertSuccessToastVisible' },
        ],
      });
    }
  );
});
