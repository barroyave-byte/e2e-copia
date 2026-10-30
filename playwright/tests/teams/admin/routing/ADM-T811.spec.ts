import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

const configMerchant = new ConfigMerchant();

test.describe('@regression Routing with Metadata Condition and 3DS', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripe3dsProcessor,
      merchantId,
      merchantToken
    );

    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: 'dlora@deuna.com',
      amount: 7000,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@ADM-T811 Routing metadata condition and 3DS require check',
    { tag: ['@admin', '@admin-preprod', '@team_admin', '@preprod', '@admin_ui'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to the payment strategies page', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      await test.step('The user goes to create specific rule page', async () => {
        await adminPaymentStrategyPage.createSpecificRule();
      });

      await test.step('The user assigns a name to the specific rule', async () => {
        await adminPaymentStrategyPage.firstStepSpecificRule();
      });

      await test.step('The user adds a condition', async () => {
        await adminPaymentStrategyPage.addConditionStepSpecificRule();
      });

      await test.step('The user configures a metadata condition', async () => {
        await adminPaymentStrategyPage.addConditionMetadata('test_metadata', {
          formatType: 'text',
          operator: 'eq',
          value: 'test text metadata',
        });
      });

      await test.step('The user verifies the metadata condition was saved', async () => {
        await adminPaymentStrategyPage.assertConditionMetadataSaved(
          'test-metadata',
          'text',
          'test-text-metadata'
        );
      });

      await test.step('The user goes to the routing next step', async () => {
        await adminPaymentStrategyPage.nextStepRouting();
      });

      await test.step('The user sets Stripe Direct with 3DS require check as payment processor for default processing', async () => {
        await adminPaymentStrategyPage.defineDefaultProcessingOrder(
          ConnectionsAvailable.stripeDirect,
          undefined,
          'create',
          false,
          true
        );
      });

      await test.step('The user saves the strategy', async () => {
        await adminPaymentStrategyPage.saveRule();
      });
    }
  );
});
