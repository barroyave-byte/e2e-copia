import { expect, test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { AdminReportsPage } from '@pages/admin/adminReportsPage';
import { getDefaultMerchant } from '@pages/admin/utils/getMerchantByEnv';

const fileName = `test_automation_${new Date().toISOString()}`;

test.describe('@regression feature to validate with automated test case', () => {
  test(
    '@ADM-T555 Download Auth & Capt report',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const adminReportsPage = new AdminReportsPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(getDefaultMerchant());
      });

      await test.step('The user goes to Orders', async () => {
        await adminHomePage.goToOrders();
      });

      await test.step('The user clicks the Export button', async () => {
        await adminOrdersPage.clickExportButton();
      });

      await test.step('The user writes a name for the file to be exported', async () => {
        await adminOrdersPage.setFileName(fileName);
      });

      await test.step('The user select Auth & Capt type report', async () => {
        await adminOrdersPage.selectAuthVsCatchTypeReportToExport();
      });

      await test.step('The user selects a range of dates for the reports data', async () => {
        await adminOrdersPage.setRangeDatesLast15Days();
      });

      await test.step('The user clicks the Export file button', async () => {
        await adminOrdersPage.clickExportFileButton();
      });
      await test.step('The user view on button Go To Reports', async () => {
        await adminReportsPage.assertModalGoToReportIsVisible();
      });
    }
  );
});
