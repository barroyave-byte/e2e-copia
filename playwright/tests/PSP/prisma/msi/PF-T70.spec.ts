import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { createDefaultCampaignMSI } from '@support/interfaces/campaigns/campaignsObject';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();

test.describe('@regression Purchase MCI con Prisma/Payway', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    // create merchant for a country
    const merchant = await configMerchant.basicSetup('AR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey; // MX, CO, PE, CL or other
    publicKey = merchant.publicKey;
    // tokenize order type deunanow (payment widget)
    const tokenized = await emaService.tokenizeDeunaNowOrder('AR', privateKey, { amount: 300000 });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    // create payment processor
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.prismaPaywayProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T70 Purchase MCI con Prisma/Payway',
    {
      tag: ['@payments_integration', '@installments', '@team_payconnect', '@preprod', '@purchase'],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const installments = '3';

      await test.step('The user configure campaign MSI from Admin', async () => {
        await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
        await adminConsolidatedFlows.configureInstallmentCampaign(
          createDefaultCampaignMSI(installments)
        );
      });

      await test.step('The user navigates to the payment screen as guest user', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('User enters credit card information', async () => {
        // Fill credit card data in payment widget
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.prismaPaywayVisaSuccessful,
          { country: 'AR' }
        );
      });

      await test.step('User select 3 installments', async () => {
        // Click pay button
        await paymentDeunaNowPage.selectInstallmentsMSI(installments);
        await page.waitForTimeout(3000);
      });

      await test.step('User select Pay', async () => {
        // Click pay button
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
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
