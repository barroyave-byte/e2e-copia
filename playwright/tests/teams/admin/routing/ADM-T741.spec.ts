import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminPaymentStrategyApmsPage } from '@pages/admin/payment_strategies/adminPaymentStrategyApmsPage';
import { AdminSpecificRulesPage } from '@pages/admin/payment_strategies/adminSpecificRulesPage';
import { RuleConditions } from '@support/interfaces/ruleConditions';
import * as apiCallNewman from '@support/newman/apiCallNewman';

const configMerchant = new ConfigMerchant();
const storeCodePSPA = 'pspa';

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
    await apiCallNewman.createPaymentProcessor(secondConnection, merchantId, merchantToken);
  });
  test(
    '@ADM-T741 Routing create specific APM rule',
    { tag: ['@admin', '@admin_connection', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminPaymentStrategyApmsPage = new AdminPaymentStrategyApmsPage(page, 'ES');
      const adminSpecificRulesPage = new AdminSpecificRulesPage(page);

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

      await test.step('The user create APM specific rule', async () => {
        const conditions = [
          {
            condition: RuleConditions.StoreList,
            data: {
              storeListName: storeCodePSPA,
              condition: 'eq',
              stores: storeCodePSPA,
            },
          },
        ];
        await adminSpecificRulesPage.addConditionsToSpecificRule(conditions, 'New rule 2025', true);
      });

      await test.step('Add routing', async () => {
        await adminPaymentStrategyApmsPage.nextStepRoutingConfig();
        await adminPaymentStrategyApmsPage.editDefaultAPMRule({ isSpecificRule: true });
      });
      await test.step('save and active rule', async () => {
        await adminPaymentStrategyApmsPage.saveAPMRuleAndWaitForResponse();
        await adminPaymentStrategyApmsPage.selectAlternativePaymentMethodTab();
      });
      await test.step('edit rule', async () => {
        await adminPaymentStrategyApmsPage.openDrawerEditAPMSpecificRule();
        await adminPaymentStrategyApmsPage.clickEditNameRule();
        await adminPaymentStrategyApmsPage.firstStepSpecificRule('Regla editada', true);
        await adminPaymentStrategyApmsPage.saveAPMRuleAndWaitForResponse();
      });
      await test.step('disable rule', async () => {
        await adminPaymentStrategyApmsPage.disableSpecificRule();
        await adminPaymentStrategyApmsPage.verifyDisableSpecificRule();
      });
    }
  );
});
