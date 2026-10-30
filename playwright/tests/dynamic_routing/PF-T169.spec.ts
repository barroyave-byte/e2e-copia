import { expect, test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminCommercePage } from '@pages/admin/commerce/adminCommercePage';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';
import { ALLOW_STRIPE_DIRECT_CONFIGURATION } from '@support/http/testData/payment/PaymentMerchantConfigurations';

const configMerchant = new ConfigMerchant();
let ruleID = '';
const createMerchantRuleBody = {
  label: 'Default',
  description: '',
  priority: 1,
  status: 'enabled',
  is_default: true,
  trigger: 'payment',
  members: [
    {
      payment_processor_id: 50,
      capabilities: [],
      sort: 1,
      strategy: 'cascade',
    },
    {
      fraud_processor: 'ACCERTIFY',
      sort: 2,
      strategy: 'cascade',
    },
  ],
};
const updateMerchantRuleBody = {
  label: 'Default',
  description: '',
  priority: 1,
  status: 'enabled',
  is_default: true,
  trigger: 'payment',
  members: [
    {
      payment_processor_id: 50,
      capabilities: [],
      sort: 1,
      strategy: 'cascade',
    },
    {
      fraud_processor: 'ACCERTIFY',
      sort: 2,
      strategy: 'cascade',
      shadow_mode: true,
    },
  ],
};

test.describe('@regression your description test suite', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await ServiceFactory.getService(SERVICE_KEYS.PAYMENT).createConfigMerchantPayments(
      ALLOW_STRIPE_DIRECT_CONFIGURATION,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T169 Update merchant rule with "shadow mode"',
    { tag: ['@fraud', '@admin_connection', '@admin-preprod', '@team_payconnect'] },
    async ({ page, paymentRoutingService }) => {
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const adminCommercePage = new AdminCommercePage(page, 'ES');
      const adminConnectionsPage = new AdminConnectionsPage(page, 'ES');

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user configures a Stripe connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.stripeDirect,
          processorsConfig.stripeProcessor
        );
      });

      await test.step('The user configure a new connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.accertify,
          processorsConfig.accertifyProcessor
        );
      });

      await test.step('The user goes to commerce to activate general fraud adjusts', async () => {
        await adminHomePage.goToCommerce();
        await adminCommercePage.activateManualReview();
        await adminCommercePage.activateOpsAutoExecution();
      });

      await test.step('The user creates the merchant rule', async () => {
        const response = await paymentRoutingService.createMerchantRule(
          merchantId,
          merchantToken,
          createMerchantRuleBody as Record<string, unknown>
        );

        ruleID = response.data.id;
      });

      await test.step('The user validates that the rule was created and the "shadow mode" is disabled', async () => {
        const response = await paymentRoutingService.getMerchantRule(
          merchantId,
          ruleID,
          merchantToken
        );

        const ruleData = response.data;
        expect(ruleData).not.toBeUndefined();
        expect(ruleData.members).not.toBeUndefined();
        expect(ruleData.members).toHaveLength(2);
        expect(ruleData.members[1].fraud_processor).toBe('ACCERTIFY');
        expect(ruleData.members[1].shadow_mode).toBe(false);
      });

      await test.step('The user updates the merchant rule', async () => {
        await paymentRoutingService.updateMerchantRule(
          merchantId,
          ruleID,
          merchantToken,
          updateMerchantRuleBody as Record<string, unknown>
        );
      });

      await test.step('The user validates that the rule was updated and the "shadow mode" is enabled', async () => {
        const response = await paymentRoutingService.getMerchantRule(
          merchantId,
          ruleID,
          merchantToken
        );

        const ruleData = response.data;
        expect(ruleData).not.toBeUndefined();
        expect(ruleData.members).not.toBeUndefined();
        expect(ruleData.members).toHaveLength(2);
        expect(ruleData.members[1].fraud_processor).toBe('ACCERTIFY');
        expect(ruleData.members[1].shadow_mode).toBe(true);
      });
    }
  );
});
