import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { test } from '@support/fixtures';

import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { commonViewportSets } from '@visual/utils/viewports';
import { verifyVisualConsistency } from '@visual/utils/visualTestingUtils';

const configMerchant = new ConfigMerchant();

test.describe('@regression @visual Export orders drawer', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });

  test(
    '@ADM-T505 Export orders drawer',
    {
      tag: [
        '@admin',
        '@smoke',
        '@visual',
        '@preprod',
        '@admin_ui',
        '@admin-preprod',
        '@team_admin',
        '@admin_smoke',
      ],
    },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);

      await test.step('User logs into Admin and sets merchant session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('User goes to Orders view in Admin', async () => {
        await adminHomePage.goToOrders();
        await adminOrdersPage.assertPresenceInOrdersView();
      });

      await test.step('User open the export orders drawer and verifies it', async () => {
        await adminOrdersPage.clickExportButton();

        await test.step('The user select Orders type report', async () => {
          await adminOrdersPage.selectOrderTypeReportToExport();
        });

        await test.step('Verify that the export orders drawer remains unchanged', async () => {
          await adminOrdersPage.assertExportColumnsSettled();
          await verifyVisualConsistency(
            page,
            commonViewportSets.desktopAndFullscreen,
            'step3-verify-export-orders-drawer',
            {
              maskLocators: [adminHomePage.merchantSelector],
              maxDiffPixelRatio: 0.02, // Allow up to 2% of pixels to be different
            }
          );
        });
      });
    }
  );
});
