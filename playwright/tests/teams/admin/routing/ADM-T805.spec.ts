import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminSpecificRulesPage } from '@pages/admin/payment_strategies/adminSpecificRulesPage';
import { RuleConditions } from '@support/interfaces/ruleConditions';

const configMerchant = new ConfigMerchant();

const storeCodePSPA = 'pspa';

test.describe('@regression condition not_in in specific rule', () => {
  let merchantId: string;

  test.beforeAll(async ({ paymentRoutingService, paymentService }) => {
    const { merchantId: merchantIdParam, merchantToken } = await configMerchant.basicSetup('MX');
    merchantId = merchantIdParam;

    await paymentRoutingService.createMerchantStore(merchantId, merchantToken, 'pspa');
    await paymentRoutingService.createMerchantStore(merchantId, merchantToken, 'pspb');
    await paymentRoutingService.createMerchantStore(merchantId, merchantToken, 'pspc');
    await paymentService.configurationMerchantPayments({
      merchantToken,
      merchantId,
      storeId: 'pspa',
      configurationMerchantPaymentsData: {
        config_code: 'USE_DYNAMIC_ROUTING',
        config_value: 'ENABLED',
      },
    });
    await paymentService.configurationMerchantPayments({
      merchantToken,
      merchantId,
      storeId: 'pspb',
      configurationMerchantPaymentsData: {
        config_code: 'USE_DYNAMIC_ROUTING',
        config_value: 'DISABLED',
      },
    });
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeDirectProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T805 Routing by store without set dynamic routing enable condition not_in',
    {
      tag: ['@admin', '@admin_connection', '@admin-preprod', '@team_admin', '@admin_smoke'],
    },
    async ({ page, emaService }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');
      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      const adminSpecificRulesPage = new AdminSpecificRulesPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
      });

      await test.step('The user goes to the payment strategies page', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      await test.step('The user selects the default rule', async () => {
        await adminPaymentStrategyPage.editDefaultRouting(ConnectionsAvailable.stripeDirect);
      });

      await test.step('Creates manual store code rule for store pspa with not_in condition', async () => {
        const conditions = [
          {
            condition: RuleConditions.StoreList,
            data: {
              storeListName: storeCodePSPA,
              condition: 'not_in',
              stores: storeCodePSPA,
            },
          },
        ];
        await adminSpecificRulesPage.addConditionsToSpecificRule(conditions, storeCodePSPA);
        await adminPaymentStrategyPage.declineTransactionForPaymentStrategy();
        await adminPaymentStrategyPage.saveRule();
        await adminPaymentStrategyPage.validateCustomRuleCreated(storeCodePSPA);
      });
    }
  );
});
