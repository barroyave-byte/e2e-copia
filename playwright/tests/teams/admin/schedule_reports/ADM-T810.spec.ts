import { test } from '@support/fixtures';
import { faker } from '@faker-js/faker';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminReportsPage } from '@pages/admin/adminReportsPage';
import { AdminScheduleReportsPage } from '@pages/admin/adminScheduleReportsPage';

const adminPassword = '123456';
const networkName = `network_${faker.lorem.slug()}_name`.replace(/-/g, '_');
const merchantsCount = 3;

let adminEmail: string;
let merchantId: string;
let networkId: string;

test.describe('@regression Admin user with parent account creates a scheduled order report', () => {
  test.beforeAll(async ({ merchantAuthService, userAuthService }) => {
    const merchants = await Promise.all(
      Array.from({ length: merchantsCount }, () =>
        merchantAuthService.createBasicMerchant({ country: 'MX' })
      )
    );

    const primaryMerchant = merchants[0];
    const merchantIds = merchants.map((merchant) => merchant.merchantId);

    merchantId = primaryMerchant.merchantId;
    const { token } = await merchantAuthService.merchantLogin();

    const network = await userAuthService.createNetwork({
      merchantToken: primaryMerchant.merchantToken,
      data: {
        name: networkName,
        is_private: true,
        parent_account_enabled: true,
      },
    });
    networkId = network.id;

    await Promise.all(
      merchants.map((merchant) =>
        userAuthService.addMerchantToNetwork({
          merchantToken: merchant.merchantToken,
          network_id: network.id,
          merchant_id: merchant.merchantId,
        })
      )
    );

    adminEmail = await apiCallNewman.createMerchantUserV3WithNetwork(
      'merchant_admin',
      'all',
      merchantIds,
      network.id,
      token
    );
  });

  test(
    '@ADM-T810 Admin user authenticates to a private network with parent account enabled and create a scheduled order report',
    { tag: ['@user_auth', '@team_admin'] },
    async ({ page }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminReportsPage = new AdminReportsPage(page);
      const adminScheduleReportsPage = new AdminScheduleReportsPage(page);

      await test.step('Re-authenticate as network admin user', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
        await adminLoginPage.loginWithEmailAndPassword(adminEmail, adminPassword);
      });

      await test.step('Navigate to orders', async () => {
        await adminHomePage.goToOrders();
      });

      await test.step('Select network merchant', async () => {
        await adminHomePage.selectNetwork(networkName, networkId);
      });

      await test.step('Go to reports page', async () => {
        await adminHomePage.goToReports();
      });

      await test.step('Navigate to scheduled reports tab', async () => {
        await adminReportsPage.clickScheduledTab();
      });

      await test.step('Open schedule report menu and select Orders type', async () => {
        await adminReportsPage.clickToOpenScheduleReportTypes();
        await adminReportsPage.goToScheduleReportCreationForm('orders');
        await adminScheduleReportsPage.assertPresenceInScheduleReportPage('orders');
      });

      await test.step('Complete report details and verify network merchants', async () => {
        await adminScheduleReportsPage.completeFirstStepScheduleReport();
        await adminScheduleReportsPage.assertMerchantsSelectorInStep2(merchantsCount);
      });

      await test.step('Create scheduled report with default columns', async () => {
        await adminScheduleReportsPage.interceptCreateScheduleReport();
        await adminScheduleReportsPage.createScheduleReport();
        await adminReportsPage.assertPresenceInScheduledReports();
      });
    }
  );
});
