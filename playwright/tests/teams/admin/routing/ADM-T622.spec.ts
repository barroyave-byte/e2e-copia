import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminSpecificRulesPage } from '@pages/admin/payment_strategies/adminSpecificRulesPage';
import { RuleConditions } from '@support/interfaces/ruleConditions';

const configMerchant = new ConfigMerchant();

const storeCodePSPA = 'pspa';
const storeCodePSPB = 'pspb';
const storeCodePSPC = 'pspc';

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let publicKey: string;
  let orderToken: string;
  let privateKey: string;
  test.beforeAll(async ({ paymentRoutingService, paymentService }) => {
    const merchantSetup = await configMerchant.basicSetup('MX');
    const {
      merchantId: merchantIdParam,
      merchantToken,
      privateKey: privateKeyParam,
    } = merchantSetup;
    privateKey = merchantSetup.privateKey;
    publicKey = merchantSetup.publicKey;

    merchantId = merchantIdParam;
    privateKey = privateKeyParam;

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
    '@ADM-T622 Routing by store without set dynamic routing enable',
    {
      tag: [
        '@admin',
        '@smoke',
        '@admin_connection',
        '@admin-preprod',
        '@team_admin',
        '@admin_smoke',
      ],
    },
    async ({ page, emaService }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
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

      await test.step('Creates manual store code rule for store pspa', async () => {
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
        await adminSpecificRulesPage.addConditionsToSpecificRule(conditions, storeCodePSPA);
        await adminPaymentStrategyPage.declineTransactionForPaymentStrategy();
        await adminPaymentStrategyPage.saveRule();
        await adminPaymentStrategyPage.validateCustomRuleCreated(storeCodePSPA);
      });

      await test.step('Creates manual store code rule for store pspb', async () => {
        const conditions = [
          {
            condition: RuleConditions.StoreList,
            data: {
              storeListName: storeCodePSPB,
              condition: 'eq',
              stores: storeCodePSPB,
            },
          },
        ];
        await adminSpecificRulesPage.addConditionsToSpecificRule(conditions, storeCodePSPB);
        await adminPaymentStrategyPage.declineTransactionForPaymentStrategy();
        await adminPaymentStrategyPage.saveRule();
        await adminPaymentStrategyPage.validateCustomRuleCreated(storeCodePSPB);
      });

      await test.step('Creates manual store code rule for store pspc', async () => {
        const conditions = [
          {
            condition: RuleConditions.StoreList,
            data: {
              storeListName: storeCodePSPC,
              condition: 'eq',
              stores: storeCodePSPC,
            },
          },
        ];
        await adminSpecificRulesPage.addConditionsToSpecificRule(conditions, storeCodePSPC);
        await adminPaymentStrategyPage.nextStepRoutingConfig();
        await adminPaymentStrategyPage.defineDefaultProcessingOrder(
          ConnectionsAvailable.stripeDirect,
          undefined,
          'create'
        );
        await adminPaymentStrategyPage.saveRule();
        await adminPaymentStrategyPage.validateCustomRuleCreated(storeCodePSPC);
      });

      // create tokenized order for pspa
      const tokenized1 = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        store_code: storeCodePSPA,
        user_email: 'dlora@deuna.com',
        amount: 7000,
      });
      orderToken = tokenized1.data.token;

      await test.step('The user opens the widget and navigates to the payments page', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('Selecting user guest to avoid otp', async () => {
        await paymentDeunaNowPage.userGuest();
      });

      await test.step('The user enters the credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.stripeVisaSuccessful, {
          country: 'MX',
        });
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been denied as per dynamic routing rules', async () => {
        const status = 'denied';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 422);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      // create tokenized order for pspb
      const tokenized2 = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        store_code: storeCodePSPB,
        user_email: 'dlora@deuna.com',
        amount: 7000,
      });
      orderToken = tokenized2.data.token;

      await test.step('The user opens the widget and navigates to the payments page', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('Selecting user guest to avoid otp', async () => {
        await paymentDeunaNowPage.userGuest();
      });

      await test.step('The user enters the credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.stripeVisaSuccessful, {
          country: 'MX',
        });
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertRouting(ConnectionsAvailable.stripeDirect);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      // create tokenized order for pspc
      const tokenized3 = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        store_code: storeCodePSPC,
        user_email: 'dlora@deuna.com',
        amount: 7000,
      });
      orderToken = tokenized3.data.token;

      await test.step('The user opens the widget and navigates to the payments page', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('Selecting user guest to avoid otp', async () => {
        await paymentDeunaNowPage.userGuest();
      });

      await test.step('The user enters the credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.stripeVisaSuccessful, {
          country: 'MX',
        });
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertRouting(ConnectionsAvailable.stripeDirect);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
