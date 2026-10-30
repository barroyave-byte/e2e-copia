import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminNotificationsPage } from '@pages/admin/adminNotificationsPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { RiskOption } from '@support/interfaces/riskOption';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

let userEmail: string;

test.describe('@regression feature to validate with the automated test case', () => {
  const configMerchant = new ConfigMerchant();

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
    '@ADM-T467 Validate notification when a defaultRule Routing is edited',
    { tag: ['@admin', '@smoke', '@admin_connection', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');
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

      await test.step('The user configure a new connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.sift,
          processorsConfig.siftFraudProcessor
        );
      });

      await test.step('user goes to strategy', async () => {
        await adminHomePage.goToPaymentStrategy();
        await adminHomePage.assertPaymentStrategyIsCurrentPage();
      });

      const risk: RiskOption[] = [
        {
          riskLevel: 'low',
          action: 'process',
          processor: {
            name: ConnectionsAvailable.stripeDirect,
            validateCvv: true,
            require3ds: false,
            actionForProcessor: 'decline',
          },
        },
      ];

      await test.step('user goes to edit default strategy', async () => {
        await adminPaymentStrategyPage.editDefaultRouting(ConnectionsAvailable.sift, risk);
      });

      await test.step('The user check if the notification was trigger', async () => {
        await adminHomePage.clickNotificationsButton();
      });

      await test.step('The user view all notifications and validate payment strategy was edited', async () => {
        await adminHomePage.goToNotifications();
        await adminNotificationsPage.assertPresenceInNotifications();
        await adminNotificationsPage.assertValidateCreateStrategyRule();
      });
    }
  );
});
