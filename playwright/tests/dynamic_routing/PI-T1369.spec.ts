import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as crypto from 'crypto';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

let configMerchant = new ConfigMerchant();

test.describe('@regression Pays in dynamic routing', () => {
  let merchantId: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;

  test.beforeAll(async ({ emaService, paymentService, paymentRoutingService }) => {
    const merchantSetup = await configMerchant.basicSetup('MX');
    const { merchantId: merchantIdParam, merchantToken } = merchantSetup;
    privateKey = merchantSetup.privateKey;
    publicKey = merchantSetup.publicKey;
    merchantId = merchantIdParam;

    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: `${crypto.randomUUID()}12345@testuser.com`,
    });
    orderToken = tokenized.data.token;

    const processorId1 = await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessor,
      merchantId,
      merchantToken
    );
    const processorId2 = await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessorInvalidCredentials,
      merchantId,
      merchantToken
    );

    await paymentService.configurationMerchantPayments({
      merchantToken,
      merchantId,
      storeId: 'all',
      configurationMerchantPaymentsData: {
        config_code: 'USE_DYNAMIC_ROUTING',
        config_value: 'ENABLED',
      },
    });

    await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'rule 1',
      priority: 4,
      status: 'enabled',
      is_default: true,
      trigger: 'merchant_rule',
      ignore_next_rules: false,
      members: [
        {
          payment_processor_id: 39,
          merchant_payment_processor_id: processorId1,
          sort: 1,
          capabilities: ['3ds'],
          strategy: 'cascade',
        },
      ],
    });

    await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'default rule',
      priority: 2,
      status: 'enabled',
      is_default: false,
      trigger: 'merchant_rule',
      ignore_next_rules: false,
      conditions: [
        {
          id: 1508,
          rule_option: { id: 10, label: 'amount' },
          operator: 'gte',
          operand: '100',
          metadata_field_name: null,
          metadata_field_type: null,
        },
      ],
      members: [
        {
          payment_processor_id: 39,
          merchant_payment_processor_id: processorId2,
          sort: 1,
          capabilities: ['3ds'],
          strategy: 'cascade',
        },
        {
          payment_processor_id: 39,
          merchant_payment_processor_id: processorId1,
          sort: 2,
          capabilities: ['3ds'],
          strategy: 'cascade',
        },
      ],
    });
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test.fixme(
    '@PI-T1369 Pago con merchant rule merchant payment processor en dynamic routing',
    {
      annotation: { type: 'bug', description: 'PF-2993' },
      tag: ['@dynamic_routing', '@team_payments_capabilities'],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('The user inserts a credit card from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.mercadoPagoVisaCardSuccessful,
          { country: 'MX' }
        );
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "processed"', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
