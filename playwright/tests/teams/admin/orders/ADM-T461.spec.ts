import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { getDefaultMerchant } from '@pages/admin/utils/getMerchantByEnv';

test.describe('@regression feature to validate with automated test case', () => {
  test(
    '@ADM-T461 Order Table Pagination: Page Navigation',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin', '@admin_smoke'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(getDefaultMerchant());
      });

      await test.step('The user goes to Orders', async () => {
        await adminHomePage.goToOrders();
        await adminOrdersPage.assertPresenceInOrdersView();
      });

      await test.step('The user clicks on paginator next page button', async () => {
        await adminOrdersPage.assertFiltersLoaded();
        await adminOrdersPage.assertOrdersLoaded(10);
        await adminOrdersPage.assertPageNavigationBasedOnOrdersPerPage('next');
      });

      await test.step('The user clicks on paginator previous page button', async () => {
        await adminOrdersPage.assertPageNavigationBasedOnOrdersPerPage('prev');
      });
    }
  );
});
