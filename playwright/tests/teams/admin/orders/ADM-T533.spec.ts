import { expect, test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { AdminReportsPage } from '@pages/admin/adminReportsPage';
import { retryOperation } from '@support/utils/retries';
import { getDefaultMerchant } from '@pages/admin/utils/getMerchantByEnv';

const fileName = `test_automation_${new Date().toISOString()}`;

test.describe('@regression feature to validate with automated test case', () => {
  test(
    '@ADM-T533 Should keep ORDER_CREATE_DATE column always selected when requesting a report',
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

      await test.step('The user select Orders type report', async () => {
        await adminOrdersPage.selectOrderTypeReportToExport();
      });

      await test.step('The user clicks in Orders creation column', async () => {
        await adminOrdersPage.clickInOrdersColumn();
      });

      await test.step('Select and deselect all columns', async () => {
        await adminOrdersPage.selectAllColumns();
        await adminOrdersPage.selectAllColumns();
      });

      await test.step('Verify creation date is not deselected', async () => {
        await adminOrdersPage.assertCreationDateIsSelected();
      });
    }
  );
});
