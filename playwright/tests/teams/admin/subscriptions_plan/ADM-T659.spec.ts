import { test } from '@support/fixtures';
import { faker } from '@faker-js/faker';

import { AdminHomePage } from '@pages/admin/adminHomePage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminSubscriptionsPage } from '@pages/admin/subscriptions/adminSubscriptionsPage';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { retryOperationReloadWithAction } from '@support/utils/retries';

test.describe('@regression feature to validate with automated test case', () => {
  const configMerchant = new ConfigMerchant();
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  test.beforeAll(async () => {
    const basicSetupResult = await configMerchant.basicSetup('MX');
    merchantName = basicSetupResult.merchantName;
    privateKey = basicSetupResult.privateKey;
    merchantId = basicSetupResult.merchantId;
    merchantToken = basicSetupResult.merchantToken;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T659 DEUNA Admin - create subscriptions plan',
    { tag: ['@admin', '@admin_smoke', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminSubscriptionsPage = new AdminSubscriptionsPage(page);
      const planName = faker.string.alphanumeric(10);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.scrollToButtonConnections();
      });

      await test.step('The admin user go to subscriptions section', async () => {
        await adminHomePage.goToSubscriptions();
      });

      await test.step('The admin user go to plans tab', async () => {
        await adminSubscriptionsPage.clickTabPlans();
      });

      await test.step('Assert plan table', async () => {
        await adminSubscriptionsPage.assertPlanTable();
      });

      await test.step('The admin user click on create plan', async () => {
        await adminSubscriptionsPage.clickButtonCreatePlan();
      });

      await test.step('Assert create plan page', async () => {
        await adminSubscriptionsPage.assertCreatePlanPage();
      });

      await test.step('Assert create plan form', async () => {
        await adminSubscriptionsPage.assertCreatePlanForm();
      });

      await test.step('Fill create plan form', async () => {
        await adminSubscriptionsPage.fillCreatePlanForm(planName);
      });

      await test.step('Assert and click button create plan', async () => {
        await adminSubscriptionsPage.assertAndClickButtonCreatePlan();
      });

      await test.step('Assert plan created', async () => {
        await adminSubscriptionsPage.clickTabPlans();
        await adminSubscriptionsPage.assertPlanTable();
        const planCreatedRow = adminSubscriptionsPage.getPlanRowByName(planName);

        // On retry, the page reload lands back on the Subscriptions tab, so the
        // Plans tab must be re-selected before the row can be found again.
        await retryOperationReloadWithAction(page, planCreatedRow, 3, 5000, async () => {
          await adminSubscriptionsPage.clickTabPlans();
          await adminSubscriptionsPage.assertPlanTable();
        });
      });
    }
  );
});
