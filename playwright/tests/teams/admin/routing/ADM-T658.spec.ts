import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as debitCardData from '@support/interfaces/debit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { RuleConditions, CardTypes } from '@support/interfaces/ruleConditions';

const configMerchant = new ConfigMerchant();

test.describe('@regression Routing by Card Type (Credit/Debit) Validation', () => {
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
      processorsConfig.stripeProcessorAuthorize,
      merchantId,
      merchantToken
    );

    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      user_email: 'dlora@deuna.com',
      amount: 7000,
    });
  });

  test(
    '@ADM-T658 CardType Routing - should route to credit and debit card',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin'] },
    async ({ page, emaService }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const adminConsolidatedFlows = new AdminConsolidatedFlows(page, 'ES');

      await test.step('Open admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('Navigate to payment strategies page', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      // Create routing rule for credit cards with Stripe
      await test.step('Create specific rule for Credit cards with Stripe', async () => {
        const conditions = [
          {
            condition: RuleConditions.CardType,
            data: CardTypes.Credit,
          },
        ];

        // Add card type validation rule
        await adminConsolidatedFlows.goToAdminAndConfigureSpecificRule(
          conditions,
          merchantId,
          'credit card validation'
        );
        await adminPaymentStrategyPage.nextStepRoutingConfig();

        // Define PSP for the rule
        await adminPaymentStrategyPage.defineDefaultProcessingOrder(
          ConnectionsAvailable.kushki,
          undefined,
          'create'
        );

        await adminPaymentStrategyPage.saveRule();
        await page.waitForTimeout(5000);
      });

      // Create routing rule for debit cards with Kushki
      await test.step('Create specific rule for Debit cards with Stripe', async () => {
        const conditions = [
          {
            condition: RuleConditions.CardType,
            data: CardTypes.Debit,
          },
        ];

        // Add card type validation rule
        await adminConsolidatedFlows.goToAdminAndConfigureSpecificRule(
          conditions,
          merchantId,
          'debit card validation'
        );
        await adminPaymentStrategyPage.nextStepRoutingConfig();

        // Define PSP for the rule
        await adminPaymentStrategyPage.defineDefaultProcessingOrder(
          ConnectionsAvailable.stripeDirect,
          undefined,
          'create'
        );
        await adminPaymentStrategyPage.saveRule();
        await page.waitForTimeout(5000);
      });

      // Test Credit Card - should route to Kushki
      await test.step('Process payment with credit card', async () => {
        const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
          user_email: 'dlora@deuna.com',
          amount: 7000,
        });
        orderToken = tokenized.data.token;

        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });

        await paymentDeunaNowPage.userGuest();

        // Use a debit card to pay
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.kushkiVisaSuccessfull, {
          country: 'MX',
        });

        await paymentDeunaNowPage.clickPay();
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('authorized', 200);

        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('authorized');
        await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.kushki);
        await adminOrderDetailsPage.assertPaymentMethod('credit_card');
        await adminOrderDetailsPage.assertRoutingStrategy('credit card validation');
      });

      // Test Debit Card - should route to Stripe
      await test.step('Process payment with debit card', async () => {
        const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
          user_email: 'dlora@deuna.com',
          amount: 7000,
        });
        orderToken = tokenized.data.token;
        orderId = tokenized.data.order.order_id;

        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });

        await paymentDeunaNowPage.userGuest();

        // Use a credit card to pay
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          debitCardData.stripeVisaDebitSuccessful,
          { country: 'MX' }
        );

        await paymentDeunaNowPage.clickPay();

        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('authorized', 200);

        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('authorized');
        await adminOrderDetailsPage.validateProcessorVisibility(
          processorsConfig.stripeProcessorAuthorize.name,
          true
        );
        await adminOrderDetailsPage.assertPaymentMethod('debit_card');
        await adminOrderDetailsPage.assertRoutingStrategy('debit card validation');
      });
    }
  );
});
