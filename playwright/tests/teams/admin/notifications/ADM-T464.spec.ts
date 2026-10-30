import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminNotificationsPage } from '@pages/admin/adminNotificationsPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { faker } from '@faker-js/faker';

let userEmail: string;

test.describe('@regression feature to validate with the automated test case', () => {
  const configMerchant = new ConfigMerchant();

  let merchantId: string;

  test.beforeAll(async ({ merchantAuthService }) => {
    const { merchantId: merchantIdParam } = await configMerchant.basicSetup('MX');
    merchantId = merchantIdParam;

    const { token } = await merchantAuthService.merchantLogin();

    userEmail = await apiCallNewman.createMerchantUserV3WithoutNetwork(
      'merchant_admin',
      'all',
      merchantId,
      token
    );
  });

  test(
    '@ADM-T464 Validate notification when a psp is created',
    { tag: ['@admin', '@smoke', '@admin_connection', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);
      const adminNotificationsPage = new AdminNotificationsPage(page);

      await test.step('Login as the merchant_admin user', async () => {
        await adminLoginPage.goToAdminLoginPage();
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();

        await adminLoginPage.loginWithEmailAndPassword(userEmail, '123456');
        await adminHomePage.assertAdminHomePageAsCurrentPage();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user configures a new connection', async () => {
        await adminConnectionsPage.configureConnection(ConnectionsAvailable.conekta, {
          ...processorsConfig.conektaProcessor,
          name: faker.company.name(),
        });
        await page.waitForTimeout(1500);
      });

      await test.step('The user checks if the notification was triggered', async () => {
        await adminConnectionsPage.waitForSuccessToastToDisappear();
        await adminHomePage.clickNotificationsButton();
      });

      await test.step('The user views all notifications and validates PSP connection', async () => {
        await adminHomePage.goToNotifications();
        await adminNotificationsPage.assertPresenceInNotifications();
        await adminNotificationsPage.assertValidateConectionsPSPTitleRetry();
        await adminNotificationsPage.assertValidateCreateProcessor();
      });
    }
  );
});
