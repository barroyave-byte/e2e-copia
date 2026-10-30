import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';

test.describe('@regression Admin audit logs: view-only RBAC', () => {
  test(
    '@ADM-T887 Admin - Audit Logs - RBAC visibility with view-only permission',
    { tag: ['@admin', '@team_admin'] },
    async ({ page }) => {
      const email = EmailGenerator.generatePayerEmail().toLowerCase();
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          {
            action: 'setup.merchant.basicSetup',
            params: { country: 'CO' },
            saveAs: 'merchant',
            stepName: 'Create a merchant for the view-only user',
          },
          {
            action: 'setup.merchant.createNetwork',
            saveAs: 'network',
            stepName: 'Create a network containing the merchant',
          },
          { action: 'admin.navigate.goToAdminPage' },
          {
            action: 'admin.auth.setMerchantSession',
            params: { merchantId: ref('merchant').at('merchantId') },
          },
          { action: 'admin.navigate.goToRoles' },
          { action: 'admin.roles.goToUsersTab' },
          { action: 'admin.roles.goToCreateUserView' },
          {
            action: 'admin.roles.createNetworkUserWithPermissions',
            params: {
              name: 'Logs view only E2E',
              email,
              networkName: ref('network').at('networkName'),
              networkId: ref('network').at('networkId'),
              merchantName: ref('merchant').at('merchantName'),
              merchantId: ref('merchant').at('merchantId'),
              environments: ['production'],
              permissions: ['logs'],
            },
            saveAs: 'password',
          },
          { action: 'admin.auth.logout' },
          {
            action: 'admin.auth.login',
            params: { username: email, password: ref('password') },
          },
          { action: 'admin.logs.goToRecords' },
          { action: 'admin.logs.assertViewOnlyAccess' },
          { action: 'admin.logs.openForbiddenExportAndAssertNotFound' },
        ],
      });
    }
  );
});
