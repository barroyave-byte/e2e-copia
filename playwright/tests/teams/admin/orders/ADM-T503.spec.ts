import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import envConfig, { allowedEnvironments } from '@support/envConfig';
import { getMerchantByConfig } from '@pages/admin/utils/getMerchantByEnv';

const isProduction = envConfig.NODE_ENV === allowedEnvironments.PRODUCTION;
const isDevelopment = envConfig.NODE_ENV === allowedEnvironments.DEVELOPMENT;

test.describe('@regression Filter orders by', () => {
  test(
    '@ADM-T503 Filtro Store Id',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        const merchantIdToUse = getMerchantByConfig({
          production: '1aca7137-2f8a-4660-a130-dae83cbe647b',
          staging: '95463fb5-6279-4ec3-8ff9-fe07aacd2142',
          default: '81d033c0-397b-4239-a504-606d5f0f915e',
        });

        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantIdToUse);
      });

      await test.step('User goes to Orders view in Admin', async () => {
        await adminHomePage.goToOrders();
        await adminOrdersPage.assertPresenceInOrdersView();
      });

      await test.step('User searches the order by store ID', async () => {
        const storeID = isDevelopment ? 'J016' : 'K003';
        const totalStore = isDevelopment ? 6 : 37;
        const stores = isProduction ? 165 : totalStore;

        await adminOrdersPage.selectStoreId(storeID, stores);
      });
    }
  );
});
