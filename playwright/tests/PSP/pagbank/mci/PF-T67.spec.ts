import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import * as pagbankPayload from '@support/interfaces/orders';
import { pagbankCampaignsMCI } from '@support/interfaces/campaigns/campaignsObject';

const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate MCI Campaign for Pagbank with the automated test case', () => {
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;

  test.beforeAll(async ({ emaService }) => {
    // create merchant for a country
    const merchant = await configMerchant.basicSetup('BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey; // MX, CO, PE, CL or other
    publicKey = merchant.publicKey;
    // tokenize order type deunanow (payment widget)
    const tokenized = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      pagbankPayload.orderCompletePayload() as any
    );
    orderToken = tokenized.data.token;
    // create payment processor
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.pagbankProcessor,
      merchantId,
      merchantToken
    );
  });

  test.fixme(
    '@PF-T67 your description test',
    {
      tag: ['@payments_integration', '@installments', '@team_payconnect'],
      annotation: { type: 'bug', description: 'PI-3382' },
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'PT');
      const adminConsolidatedFlows = new AdminConsolidatedFlows(page, 'PT');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');
      const installments = '6';

      await test.step('The user configure campaign MCI from Admin', async () => {
        await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
        await adminConsolidatedFlows.configureInstallmentCampaign(pagbankCampaignsMCI);
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
          creditCardData.pagbankVisaCredicardSucessful,
          { country: 'BR' }
        );
      });

      await test.step('User select 6 installments', async () => {
        // Click pay button
        await paymentDeunaNowPage.selectInstallmentsMCI(installments);
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
        await adminOrderDetailsPage.assertTypeInstallments('MCI');
      });
    }
  );
});
