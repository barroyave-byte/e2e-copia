import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminNotificationsPage } from '@pages/admin/adminNotificationsPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';

let userEmail: string;

const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;

  test.beforeAll(async ({ merchantAuthService }) => {
    const { merchantId: merchantIdParam, merchantToken } = await configMerchant.basicSetup('MX');

    merchantId = merchantIdParam;

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeProcessor,
      merchantId,
      merchantToken
    );

    const { token } = await merchantAuthService.merchantLogin();

    userEmail = await apiCallNewman.createMerchantUserV3WithoutNetwork(
      'merchant_admin',
      'all',
      merchantId,
      token
    );
  });

  test(
    '@ADM-T466 Validate notification when a psp is deactivated',
    {
      tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin'],
    },
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

      await test.step('The user goes to actives providers', async () => {
        await adminConnectionsPage.clickOnListActiveProcessors();
      });

      await test.step('user edit disable conection', async () => {
        await adminConnectionsPage.clickOnProcessorOptions();
        await adminConnectionsPage.clickOnDisableProcessor();
        await adminConnectionsPage.confirmDisableConnectionModal();
      });

      await test.step('The user check if the notification was trigger', async () => {
        await adminConnectionsPage.waitForSuccessToastToDisappear();
        await adminHomePage.clickNotificationsButton();
      });

      await test.step('The user view all notifications and validate psp conection', async () => {
        await adminHomePage.goToNotifications();
        await adminNotificationsPage.assertPresenceInNotifications();
        await adminNotificationsPage.assertValidateConectionsPSPTitle();
        await adminNotificationsPage.assertValidateDisableProcessor();
      });
    }
  );
});
