import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { paypalACDCCampaignsMCI } from '@support/interfaces/campaigns/campaignsObject';

const configMerchant = new ConfigMerchant();

test.describe('@regression Pays with PayPal ACDC MX using IC2B', () => {
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
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, { amount: 300000 });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.paypalACDCProcessorWithIC2B,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1836 Purchase exitoso con 3 meses de installments MSI (IC2B) en México',
    {
      tag: ['@installments', '@team_payment_integration', '@preprod'],
      annotation: { type: 'bug', description: 'PI-3709' },
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminConsolitedFlows = new AdminConsolidatedFlows(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');
      const installments = '3';

      await test.step('Merchant configures campaign from Admin', async () => {
        await adminConsolitedFlows.goToAdminAndSetMerchantId(merchantId);
        await adminConsolitedFlows.configureInstallmentCampaign(paypalACDCCampaignsMCI);
      });

      await test.step('The user opens the testing page and opens the required widget', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('User enters credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.paypalACDCVisaSucessful,
          { country: 'MX' }
        );
      });

      await test.step('User selects 3 months MSI installments plan', async () => {
        await paymentDeunaNowPage.selectInstallmentsMSI(installments);
      });

      await test.step('User selects Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed and the number as well as type of installments is as expected', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed');
        await adminOrderDetailsPage.assertNumberOfInstallments(Number(installments));
        await adminOrderDetailsPage.assertTypeInstallments('MSI');
      });
    }
  );
});
