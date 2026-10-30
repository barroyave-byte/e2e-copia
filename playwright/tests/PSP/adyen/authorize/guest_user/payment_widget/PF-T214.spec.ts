import { EmailGenerator } from '@support/utils/EmailGenerator';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { RuleConditions } from '@support/interfaces/ruleConditions';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminSpecificRulesPage } from '@pages/admin/payment_strategies/adminSpecificRulesPage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import * as validationCapture from '@support/interfaces/capture';

const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: EmailGenerator.generatePayerEmail(),
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.adyenProcessorAuthorize,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.openPayProcessorAuthorize,
      merchantId,
      merchantToken
    );
    await apiCallNewman.configDynamicRouting(merchantId, merchantToken);
  });

  test(
    '@PF-T214 Authorize failed with routing',
    { tag: ['@team_payconnect'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');
      const adminSpecificRulesPage = new AdminSpecificRulesPage(page);
      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
      });

      await test.step('The user goes to the payment strategies page', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      await test.step('Creates manual store code rule for store all', async () => {
        const conditions = [
          {
            condition: RuleConditions.StoreList,
            data: {
              storeListName: 'all',
              condition: 'eq',
              stores: 'all',
            },
          },
        ];
        await adminSpecificRulesPage.addConditionsToSpecificRule(conditions, 'all');
        await adminPaymentStrategyPage.nextStepRoutingConfig();
        await adminPaymentStrategyPage.defineDefaultProcessingOrder(
          [ConnectionsAvailable.adyen, ConnectionsAvailable.openpay],
          undefined,
          'create'
        );
        await adminPaymentStrategyPage.saveRule();
        await adminPaymentStrategyPage.validateCustomRuleCreatedRefreshingTable('all');
      });

      await test.step('The user opens the testing page and opens the required widget', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('User enters credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.openpayVisaSuccessful, {
          country: 'MX',
        });
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status authorized', async () => {
        const status = 'authorized';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertRouting(ConnectionsAvailable.openpay);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('A capture is sent to the authorized transaction', async () => {
        await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          3000,
          undefined,
          { orderToken }
        );
        const status = 'captured';
        await adminOrderDetailsPage.assertRouting(ConnectionsAvailable.openpay);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
