import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminSubscriptionsPage } from '@pages/admin/subscriptions/adminSubscriptionsPage';

const configMerchant = new ConfigMerchant();

let userEmail: string;

test.describe('@regression DEUNA SuperAdmin - subscriptions with payment processor Kushki MX', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let merchantId2: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const { networkId } = await apiCallNewman.createNetwork(merchantId, merchantToken);

    const merchant2 = await configMerchant.basicSetup('MX');
    merchantId2 = merchant2.merchantId;
    const merchantName2 = merchant2.merchantName;
    const privateKey2 = merchant2.privateKey;
    const merchantToken2 = merchant2.merchantToken;
    await apiCallNewman.addMerchantToNetwork(networkId, merchantId2, merchantToken2);

    userEmail = await apiCallNewman.createMerchantUserV2WithNework(
      'superadmin',
      'all',
      merchantId,
      networkId,
      merchantToken2
    );
  });

  test(
    '@ADM-T537 DEUNA SuperAdmin subscriptions tab',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminSubscriptionsPage = new AdminSubscriptionsPage(page);

      await test.step('The superadmin user logs in', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId2);
      });
      await test.step('user go to subscriptions section', async () => {
        await adminHomePage.goToSubscriptions();
      });
      await test.step('user go to subscriptions tab', async () => {
        await adminSubscriptionsPage.clickTabSubscriptions();
      });
      await test.step('Assert subscription table', async () => {
        await adminSubscriptionsPage.assertSubscriptionsTable();
      });
    }
  );
});
