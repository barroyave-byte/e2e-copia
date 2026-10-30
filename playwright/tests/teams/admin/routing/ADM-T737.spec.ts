import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminPaymentStrategyApmsPage } from '@pages/admin/payment_strategies/adminPaymentStrategyApmsPage';
import * as apiCallNewman from '@support/newman/apiCallNewman';

const configMerchant = new ConfigMerchant();
let secondMerchantPaymentProcessorId: string | undefined;
test.describe('@regression Routing APMs rules', () => {
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
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.aplazoProcessor,
      merchantId,
      merchantToken
    );
    const secondConnection = { ...processorsConfig.aplazoProcessor, name: 'Aplazo 2' };
    secondMerchantPaymentProcessorId = await apiCallNewman.createPaymentProcessor(
      secondConnection,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T737 Routing create default APM rule',
    { tag: ['@admin', '@admin_connection', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminPaymentStrategyApmsPage = new AdminPaymentStrategyApmsPage(page, 'ES');

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to the payment strategies page', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      await test.step('The user Click on the APM tab', async () => {
        await adminPaymentStrategyApmsPage.selectAlternativePaymentMethodTab();
      });
      await test.step('The user create APM default rule', async () => {
        await adminPaymentStrategyApmsPage.createDefaultAPMRule();
      });
      await test.step('The user verify APM default rule created', async () => {
        await adminPaymentStrategyApmsPage.verifyDefaultAPMRuleCreated();
      });
      await test.step('The user edit APM default rule', async () => {
        await adminPaymentStrategyApmsPage.openDrawerEditAPMDefaultRule();
        await adminPaymentStrategyApmsPage.editDefaultAPMRule({
          merchantPaymentProcessorId: secondMerchantPaymentProcessorId,
        });
      });
      await test.step('The user verify APM default rule edited', async () => {
        await adminPaymentStrategyApmsPage.verifyDefaultAPMRuleEdited('Aplazo 2');
      });

      await test.step('The user disable APM default rule', async () => {
        await adminPaymentStrategyApmsPage.disableDefaultAPMRule();
      });
      await test.step('The user verify APM default rule created', async () => {
        await adminPaymentStrategyApmsPage.verifyDefaultAPMRuleDisabled();
      });
    }
  );
});
