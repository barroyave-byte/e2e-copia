import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { expect, test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminCommercePage } from '@pages/admin/commerce/adminCommercePage';
import { ALLOW_STRIPE_DIRECT_CONFIGURATION } from '@support/http/testData/payment/PaymentMerchantConfigurations';

const configMerchant = new ConfigMerchant();
const createMerchantRuleBody = {
  label: 'Default',
  priority: 1,
  status: 'enabled',
  is_default: true,
  trigger: 'merchant_rule',
  conditions: [],
  members: [
    {
      fraud_processor_id: '3',
      fraud_processor: 'CYBERSOURCE',
      sort: 1,
      capabilities: null,
      enabled: true,
      strategy: 'cascade',
    },
    {
      fraud_processor: 'SIFT',
      sort: 2,
      enabled: true,
      strategy: 'cascade',
      shadow_mode: true,
    },
    {
      fraud_processor: 'CLEARSALE',
      sort: 3,
      enabled: true,
      strategy: 'cascade',
      shadow_mode: true,
      post_authorization: true,
    },
  ],
  children: [
    {
      conditions: [
        {
          id: 5061,
          rule_option: {
            id: 15,
            label: 'fraud_risk',
          },
          operator: 'eq',
          operand_config: null,
          operand: 'high',
          operand_type: 'values',
          metadata_field_name: null,
          metadata_field_type: null,
          error_code: '',
          error_message: '',
        },
      ],
      members: [
        {
          payment_processor_id: 50,
          payment_processor_name: 'stripe',
          merchant_payment_processor_name: 'STRIPE_DIRECT',
          sort: 1,
          capabilities: ['cvv'],
          enabled: true,
          strategy: 'cascade',
        },
      ],
    },
    {
      conditions: [
        {
          id: 5062,
          rule_option: {
            id: 15,
            label: 'fraud_risk',
          },
          operator: 'eq',
          operand_config: null,
          operand: 'medium',
          operand_type: 'values',
          metadata_field_name: null,
          metadata_field_type: null,
          error_code: '',
          error_message: '',
        },
      ],
      members: [
        {
          payment_processor_id: 50,
          payment_processor_name: 'stripe',
          merchant_payment_processor_name: 'STRIPE_DIRECT',
          sort: 1,
          capabilities: ['cvv'],
          enabled: true,
          strategy: 'cascade',
        },
      ],
    },
    {
      conditions: [
        {
          id: 5063,
          rule_option: {
            id: 15,
            label: 'fraud_risk',
          },
          operator: 'eq',
          operand_config: null,
          operand: 'low',
          operand_type: 'values',
          metadata_field_name: null,
          metadata_field_type: null,
          error_code: '',
          error_message: '',
        },
      ],
      members: [
        {
          payment_processor_id: 50,
          payment_processor_name: 'stripe',
          merchant_payment_processor_name: 'STRIPE_DIRECT',
          sort: 1,
          capabilities: ['cvv'],
          enabled: true,
          strategy: 'cascade',
        },
      ],
    },
  ],
};

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ paymentService, emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    await paymentService.createConfigMerchantPayments(
      ALLOW_STRIPE_DIRECT_CONFIGURATION,
      merchantId,
      merchantToken
    );
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.configDynamicRouting(merchantId, merchantToken);
  });

  test(
    '@PF-T179 Purchase with fraud shadow mode - one pre-auth main provider and shadow provider - one post-auth shadow',
    { tag: ['@fraud', '@admin_connection', '@admin-preprod', '@team_payconnect'] },
    async ({ page, paymentRoutingService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page, 'ES');
      const adminCommercePage = new AdminCommercePage(page, 'ES');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

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

      await test.step('The user configures a Cybersource fraud connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.cybersourceFraud,
          processorsConfig.cybersourceFraudProcessor
        );
      });

      await test.step('The user configures a Sift fraud connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.sift,
          processorsConfig.siftFraudProcessor
        );
      });

      await test.step('The user configures a Clearsale fraud connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.clearsale,
          processorsConfig.clearsaleFraudProcessor
        );
      });

      await test.step('The user goes to commerce to activate general fraud adjusts', async () => {
        await adminHomePage.goToCommerce();
        await adminCommercePage.activateManualReview();
        await adminCommercePage.activateOpsAutoExecution();
      });

      await test.step('The user creates a merchant routing rule setting the fraud providers', async () => {
        await paymentRoutingService.createMerchantRule(
          merchantId,
          merchantToken,
          createMerchantRuleBody as Record<string, unknown>
        );
      });

      await test.step('The user open the widget and navigate to the payment page', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('User enters credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.stripeMastercardSuccessful,
          { country: 'MX' }
        );
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('It is validated that the order was evaluated by the main and shadow providers', async () => {
        //Validate main provider
        await adminOrderDetailsPage.assertFraudAnalysisData(
          'low',
          'low_risk',
          'accepted',
          'CYBERSOURCE',
          privateKey,
          orderToken
        );

        //Validate shadow providers
        await adminOrderDetailsPage.assertFraudShadowAnalysisData(
          0,
          'low',
          'low_risk',
          'automatic_decision',
          'SIFT',
          privateKey,
          orderToken
        );
        await adminOrderDetailsPage.assertFraudShadowAnalysisData(
          1,
          '',
          '',
          'pending_analysis',
          'CLEARSALE',
          privateKey,
          orderToken
        );
      });
    }
  );
});
