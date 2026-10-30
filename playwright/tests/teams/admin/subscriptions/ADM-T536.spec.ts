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
  let merchantName2: string;
  let privateKey2: string;

  test.beforeAll(async () => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    const { networkId } = await apiCallNewman.createNetwork(merchantId, merchantToken);

    const merchantConfig2 = await configMerchant.basicSetup('MX');
    merchantId2 = merchantConfig2.merchantId;
    merchantName2 = merchantConfig2.merchantName;
    privateKey2 = merchantConfig2.privateKey;
    await apiCallNewman.addMerchantToNetwork(networkId, merchantId2, merchantToken);

    userEmail = await apiCallNewman.createMerchantUserV2WithNework(
      'superadmin',
      'all',
      merchantId,
      networkId,
      merchantToken
    );
  });

  test(
    '@ADM-T536 DEUNA SuperAdmin plans tab',
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
      await test.step('user go to plans tab', async () => {
        await adminSubscriptionsPage.clickTabPlans();
      });
      await test.step('Assert plan table', async () => {
        await adminSubscriptionsPage.assertPlanTable();
      });
    }
  );
});
