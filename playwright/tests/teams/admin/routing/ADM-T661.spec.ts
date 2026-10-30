import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { RuleConditions } from '@support/interfaces/ruleConditions';
import { AdminSpecificRulesPage } from '@pages/admin/payment_strategies/adminSpecificRulesPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();

test.describe('@regression Routing by Market Type (Moto/Ecommerce)', () => {
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
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessorAuthorize,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessorAuthorize,
      merchantId,
      merchantToken
    );

    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: 'dlora@deuna.com',
      market_type: 'moto',
      amount: 7000,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@ADM-T661 MarketType Routing - should route with marketType',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');
      const adminSpecificRulesPage = new AdminSpecificRulesPage(page);
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('Open admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('Navigate to payment strategies page', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      await test.step('The user selects the default rule', async () => {
        await adminPaymentStrategyPage.editDefaultRouting(ConnectionsAvailable.mercadopago);
      });

      await test.step('Creates manual rule for vertical', async () => {
        const conditions = [
          {
            condition: RuleConditions.Vertical,
            data: {
              condition: 'eq',
              vertical: 'ecommerce',
            },
          },
        ];
        await adminSpecificRulesPage.addConditionsToSpecificRule(
          conditions,
          'test_market_type_eccomerce_decline'
        );
        await adminPaymentStrategyPage.declineTransactionForPaymentStrategy();
        await adminPaymentStrategyPage.saveRule();
        await adminPaymentStrategyPage.validateCustomRuleCreated(
          'test_market_type_eccomerce_decline'
        );
      });

      await test.step('Creates manual rule for vertical', async () => {
        const conditions = [
          {
            condition: RuleConditions.Vertical,
            data: {
              condition: 'eq',
              vertical: 'moto',
            },
          },
        ];
        await adminSpecificRulesPage.addConditionsToSpecificRule(
          conditions,
          'test_market_type_moto_process_by_kushki'
        );
        await adminPaymentStrategyPage.nextStepRoutingConfig();

        await adminPaymentStrategyPage.defineDefaultProcessingOrder(
          ConnectionsAvailable.kushki,
          undefined,
          'create'
        );
        await adminPaymentStrategyPage.saveRule();
        await adminPaymentStrategyPage.validateCustomRuleCreated(
          'test_market_type_moto_process_by_kushki'
        );
      });

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
      });
    }
  );
});
