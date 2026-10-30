import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { USE_DYNAMIC_ROUTING_ENABLED } from '@support/http/testData/payment/PaymentMerchantConfigurations';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();

test.describe('@regression Purchase MSI with Dlocal Peru', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, paymentRoutingService, paymentService }) => {
    const merchant = await configMerchant.basicSetup('PE');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('PE', privateKey, { amount: 600000 });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;

    // Create multiple merchant payment processors
    const merchantPaymentProcessorID = await apiCallNewman.createPaymentProcessor(
      processorsConfig.dlocalProcessorPE,
      merchantId,
      merchantToken
    );

    // Configure dynamic routing based on currency
    await paymentService.createConfigMerchantPayments(
      USE_DYNAMIC_ROUTING_ENABLED,
      merchantId,
      merchantToken
    );
    await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'Currency',
      conditions: [{ operand: 'PEN', operator: 'in', rule_option: { id: 5, label: 'currency' } }],
      isTransact: true,
      is_default: false,
      trigger: 'payment',
      children: [],
      ignore_next_rules: true,
      priority: 2,
      status: 'enabled',
      members: [
        {
          payment_processor_id: 5, // Dlocal processor ID
          capabilities: ['cvv'],
          sort: 1,
          merchant_payment_processor_id: merchantPaymentProcessorID,
          strategy: 'cascade',
        },
      ],
    });

    // Create campaign
    await apiCallNewman.createCampaignMSI('PEN', merchantId, merchantToken);
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

  test(
    '@PI-T1695 Crear una transaccion con MSI con estado Processed con Usuario Invitado con procesador Dlocal desde el Checkout',
    { tag: ['@payments_integration', '@installments', '@flaky', '@team_payment_integration'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const installments = '6';

      await test.step('User enters credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.dlocalVisaInstallmentCardPE,
          { country: 'PE' }
        );
      });

      await test.step('User selects MSI', async () => {
        await paymentDeunaNowPage.selectInstallmentsMSI(installments);
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed with the correct number of installments', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
        await adminOrderDetailsPage.assertNumberOfInstallments(Number(installments));
        await adminOrderDetailsPage.assertTypeInstallments('MSI');
      });
    }
  );
});
