import { test } from '@support/fixtures';
import { faker } from '@faker-js/faker';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { AdminReportsPage } from '@pages/admin/adminReportsPage';

const adminPassword = '123456';
const networkName = `network_${faker.lorem.slug()}_name`.replace(/-/g, '_');
const fileName = `test_automation_${new Date().toISOString()}`;
let adminEmail: string;
let merchantId: string;
let networkId: string;
let adminToken: string;

test.describe('@regression Admin user with parent account creates an adhoc order report', () => {
  test.beforeAll(async ({ merchantAuthService, userAuthService }) => {
    const [merchantA, merchantB, merchantC] = await Promise.all([
      merchantAuthService.createBasicMerchant({ country: 'MX' }),
      merchantAuthService.createBasicMerchant({ country: 'MX' }),
      merchantAuthService.createBasicMerchant({ country: 'MX' }),
    ]);
    merchantId = merchantA.merchantId;
    const { token } = await merchantAuthService.merchantLogin();
    adminToken = token;

    const network = await userAuthService.createNetwork({
      merchantToken: merchantA.merchantToken,
      data: {
        name: networkName,
        is_private: true,
        parent_account_enabled: true,
      },
    });
    networkId = network.id;

    await Promise.all([
      userAuthService.addMerchantToNetwork({
        merchantToken: merchantA.merchantToken,
        network_id: network.id,
        merchant_id: merchantA.merchantId,
      }),
      userAuthService.addMerchantToNetwork({
        merchantToken: merchantB.merchantToken,
        network_id: network.id,
        merchant_id: merchantB.merchantId,
      }),
      userAuthService.addMerchantToNetwork({
        merchantToken: merchantC.merchantToken,
        network_id: network.id,
        merchant_id: merchantC.merchantId,
      }),
    ]);

    adminEmail = await apiCallNewman.createMerchantUserV3WithNetwork(
      'merchant_admin',
      'all',
      [merchantA.merchantId, merchantB.merchantId, merchantC.merchantId],
      network.id,
      token
    );
  });

  test(
    '@ADM-T809 Admin user with parent account creates an adhoc order report',
    { tag: ['@user_auth', '@team_admin'] },
    async ({ page }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const adminReportsPage = new AdminReportsPage(page);

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

      await test.step('Open the export drawer', async () => {
        await adminOrdersPage.clickExportButton();
      });

      await test.step('Set report file name', async () => {
        await adminOrdersPage.setFileName(fileName);
      });

      await test.step('Select Orders report type', async () => {
        await adminOrdersPage.selectOrderTypeReportToExport();
      });

      await test.step('Select date range (last 15 days)', async () => {
        await adminOrdersPage.setRangeDatesLast15Days();
      });

      await test.step('Verify all merchants are pre-selected in export drawer', async () => {
        await adminOrdersPage.assertAllMerchantsSelectedForExport(3);
      });

      await test.step('Submit export and verify processing modal', async () => {
        await adminOrdersPage.clickExportFileButton();
        await adminReportsPage.assertModalGoToReportIsVisible();
      });

      await test.step('Go to reports page', async () => {
        await adminReportsPage.clickGoToReports();
      });

      await test.step('Verify reports page loaded', async () => {
        await adminReportsPage.assertReportsTitleVisible();
      });

      await test.step('Verify report appears in the downloads table', async () => {
        await adminReportsPage.assertReportInTable(fileName);
      });
    }
  );
});
