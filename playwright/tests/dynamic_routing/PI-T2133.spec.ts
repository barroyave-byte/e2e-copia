import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';

import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import {
  InstallmentsCampaign,
  ConfigInstallmentsMonths,
} from '@pages/admin/installments_configuration/installmentsCampaign';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { USE_DYNAMIC_ROUTING_ENABLED } from '@support/http/testData/payment/PaymentMerchantConfigurations';

const installments = '3';
const configMerchant = new ConfigMerchant();
const totalAmount = 3000;
const email = `${crypto.randomUUID()}12345@testuser.com`;

const installmentTypeRuleConfig = {
  rule_name: 'Installment Type rule',
  processor_id: processorsConfig.bambooProcessorInARS.payment_processor_id,
  merchant_payment_processor_id: '',
};

const configInstallmentsMonth: ConfigInstallmentsMonths = {
  config_months: [
    {
      months: 3,
      enabled: true,
      config_franchise: [
        {
          franchise: 'visa',
          enabled: true,
          installment_rate: '0',
          min_amount: '1',
          max_amount: '1000',
        },
      ],
    },
    {
      months: 6,
      enabled: true,
      config_franchise: [
        {
          franchise: 'visa',
          enabled: true,
          installment_rate: '0',
          min_amount: '1',
          max_amount: '1000',
        },
      ],
    },
    {
      months: 9,
      enabled: true,
      config_franchise: [
        {
          franchise: 'visa',
          enabled: true,
          installment_rate: '0',
          min_amount: '1',
          max_amount: '1000',
        },
      ],
    },
  ],
};

const installmentsCampaignBamboo: InstallmentsCampaign = {
  name: 'Test campaign - Bamboo',
  description: 'Test campaign description',
  installments_type: 'MSI',
  campaign_date: null,
  processor: [ConnectionsAvailable.bamboo],
  months: [3, 6, 9],
  months_config: configInstallmentsMonth,
};

const getRoutingRule = (config: any) => {
  return {
    label: config.rule_name,
    conditions: [
      {
        operand: 'MSI',
        operator: 'eq',
        rule_option: {
          id: 14,
          label: 'installment_type',
        },
      },
    ],
    isTransact: true,
    is_default: false,
    trigger: 'payment',
    children: [],
    ignore_next_rules: true,
    priority: 5,
    status: 'enabled',
    members: [
      {
        payment_processor_id: config.processor_id,
        capabilities: ['cvv'],
        sort: 1,
        merchant_payment_processor_id: config.merchant_payment_processor_id,
        strategy: 'cascade',
      },
    ],
  };
};

test.describe('@regression Purchase fallido con plan de installments consolidado con una credencial, utilizando dynamic routing para la seleccionar una credencial diferente', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('AR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;

    // create first processor
    installmentTypeRuleConfig.merchant_payment_processor_id =
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.bambooProcessorInARS,
        merchantId,
        merchantToken
      );
    // create second processor
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.prismaPaywayProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T2133 Purchase fallido con plan de installments consolidado con una credencial utilizando dynamic routing para la seleccionar una credencial diferente',
    {
      tag: [
        '@payments_integration',
        '@installments',
        '@dynamic_routing',
        '@team_payments_capabilities',
      ],
    },
    async ({ page, emaService, paymentRoutingService, paymentService }) => {
      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');

      await test.step('Create installment campaign', async () => {
        await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
        await adminConsolidatedFlows.configureInstallmentCampaign(installmentsCampaignBamboo);
        await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
      });

      await paymentService.createConfigMerchantPayments(
        USE_DYNAMIC_ROUTING_ENABLED,
        merchantId,
        merchantToken
      );

      await test.step('Configure payment strategy by installment type', async () => {
        await paymentRoutingService.createMerchantRule(
          merchantId,
          merchantToken,
          getRoutingRule(installmentTypeRuleConfig) as Record<string, unknown>
        );
      });

      await test.step('Configure payment strategy by email filter', async () => {
        await test.step('The user goes to the payment strategies page', async () => {
          await adminHomePage.goToPaymentStrategy();
        });

        await test.step('The user goes to create specific rule page', async () => {
          await adminPaymentStrategyPage.createSpecificRule();
        });
        await test.step('Assign Name', async () => {
          await adminPaymentStrategyPage.firstStepSpecificRule();
        });
        await test.step('Add condition', async () => {
          await adminPaymentStrategyPage.addConditionStepSpecificRule();
        });
        await test.step('User create email list', async () => {
          await adminPaymentStrategyPage.addConditionManualEmailList(undefined, email);
        });
        await test.step('routing and save the rule', async () => {
          await adminPaymentStrategyPage.nextStepRouting();
          await adminPaymentStrategyPage.defineDefaultProcessingOrder(
            ConnectionsAvailable.prismaPayway,
            undefined,
            'create'
          );
          await adminPaymentStrategyPage.saveRule();
        });
        await test.step('validate rule created', async () => {
          await adminPaymentStrategyPage.validateRuleCreated();
        });
      });

      await test.step('Make purchase with email rule', async () => {
        const tokenized = await emaService.tokenizeDeunaNowOrder('AR', privateKey, {
          user_email: email,
          amount: totalAmount,
        });
        orderToken = tokenized.data.token;
        orderId = tokenized.data.order.order_id;

        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });

        await test.step('The user inserts a credit card from widget de pagos', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            creditCardData.prismaPaywayVisaSuccessful,
            { country: 'AR' }
          );
        });

        await test.step('User select MSI', async () => {
          await paymentDeunaNowPage.selectInstallmentsMSI(installments);
        });

        await test.step('The user clicks on pay', async () => {
          await paymentDeunaNowPage.clickPay();
        });

        await test.step('Validate that the order has been denied successfully with status code "422" and status order "denied"', async () => {
          await paymentDeunaNowPage.assertErrorStatusRequestPurchase('DP-4036', 422);
        });

        await test.step('Validate in admin  order installments MSI details', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('denied');
        });
      });
    }
  );
});
