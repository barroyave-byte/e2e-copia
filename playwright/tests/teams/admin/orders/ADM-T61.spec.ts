import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { getDefaultMerchant } from '@pages/admin/utils/getMerchantByEnv';

test.describe('@regression feature to validate with automated test case', () => {
  test(
    '@ADM-T61 Search an order by its order id',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin', '@admin_smoke'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);

      await test.step('User opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(getDefaultMerchant());
      });

      await test.step('User goes to Orders', async () => {
        await adminHomePage.goToOrders();
        await adminOrdersPage.assertPresenceInOrdersView();
      });

      await test.step('User fill the orders input search', async () => {
        const orderId = await adminOrdersPage.searchARandomOrder();
        console.log('orderId', orderId);
        await adminOrdersPage.assertOrderFound(orderId);
      });
    }
  );
});
