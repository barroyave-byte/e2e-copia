import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as crypto from 'crypto';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { ALLOW_STRIPE_DIRECT_CONFIGURATION } from '@support/http/testData/payment/PaymentMerchantConfigurations';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import { AdminCommercePage } from '@pages/admin/commerce/adminCommercePage';

let transactionId: string;
let userEmail: string;

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
      shadow_mode: false,
    },
    {
      fraud_processor: 'CLEARSALE',
      sort: 2,
      enabled: true,
      strategy: 'cascade',
      shadow_mode: true,
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
          post_authorization: false,
          shadow_mode: false,
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

test.describe('@regression Filter orders by', () => {
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
    userEmail = `${crypto.randomUUID()}@testuser.com`;
    const responseTokenize = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: userEmail,
    });
    orderToken = responseTokenize.data.token;
    orderId = responseTokenize.data.order.order_id;
    transactionId = responseTokenize.data.order.order_id;
    console.log(`Order ID: ${transactionId}, User Email: ${userEmail}`);
    await apiCallNewman.configDynamicRouting(merchantId, merchantToken);
  });

  test(
    '@ADM-T475 Filtrar ordenes por order id - correo - estado de pago - metodo de pago y estado de fraude',
    { tag: ['@regression', '@admin', '@smoke', '@admin-preprod', '@team_admin', '@admin_smoke'] },
    async ({ page, paymentRoutingService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page, 'ES');
      const adminCommercePage = new AdminCommercePage(page, 'ES');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');
      const adminOrdersPage = new AdminOrdersPage(page);

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
        await adminCommercePage.configurationShadowMode();
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

      await test.step('User goes to Orders view in Admin', async () => {
        await adminHomePage.goToOrders();
        await adminOrdersPage.assertPresenceInOrdersView();
      });

      await test.step('User searches the order by order ID', async () => {
        console.log(`Searching order with ID: ${transactionId}`);
        await adminOrdersPage.searchOrderById(transactionId);
        await adminOrdersPage.assertOrderFound(transactionId);
      });

      await test.step('Clear filters after Order ID search', async () => {
        await adminOrdersPage.clickClearFilters();
      });

      await test.step('User searches the order by Email', async () => {
        console.log(`Searching order with Email: ${userEmail}`);
        await adminOrdersPage.searchOrderByEmail(userEmail);
        await adminOrdersPage.assertOrderFoundByEmail(userEmail);
      });

      await test.step('Clear filters after Email search', async () => {
        await adminOrdersPage.clickClearFilters();
      });

      await test.step('User applies filter for payment status "Procesado"', async () => {
        await adminOrdersPage.searchOrderById(transactionId);
        await adminOrdersPage.selectPaymentStatus('Procesado');
        await adminOrdersPage.assertOrderFound(transactionId);
      });

      await test.step('User clears the filters after filtering by payment status', async () => {
        await adminOrdersPage.clickClearFilters();
      });

      await test.step('User applies filter for payment method "Tarjeta de crédito"', async () => {
        await adminOrdersPage.searchOrderById(transactionId);
        await adminOrdersPage.selectPaymentMethod('Tarjeta de crédito');
        await adminOrdersPage.assertOrderFound(transactionId);
      });

      await test.step('User clears the filters after filtering by payment method', async () => {
        await adminOrdersPage.clickClearFilters();
      });

      await test.step('User applies filter for fraud status "Todos"', async () => {
        await adminOrdersPage.searchOrderById(transactionId);
        await adminOrdersPage.selectFraudStatus('Todos');
        await adminOrdersPage.assertOrderFound(transactionId);
      });

      await test.step('User clears the filters after filtering by fraud status', async () => {
        await adminOrdersPage.clickClearFilters();
      });
    }
  );
});
