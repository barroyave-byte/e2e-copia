import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { defaultCampaignsMCI } from '@support/interfaces/campaigns/campaignsObject';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();

test.describe('@regression Buy with deuna now using installments', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('CO');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.globalpayProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1137 Purchase installments 3 meses with installments_plan_option_id - Globalpay',
    {
      tag: [
        '@payments_integration',
        '@installments',
        '@remove_preprod',
        '@team_payment_integration',
        '@preprod',
      ],
    },
    async ({ page }) => {
      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The user configure campaign MCI from Admin', async () => {
        await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
        await adminConsolidatedFlows.configureInstallmentCampaign(defaultCampaignsMCI);
      });

      await test.step('The user navigates to the payment screen as guest user', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      const installments = '3';

      await test.step('User inserts Credit Card for DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.globalpayVisaSuccessful,
          { country: 'CO' }
        );
      });

      await test.step('User select MSI', async () => {
        await paymentDeunaNowPage.selectInstallmentsMCI(installments);
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the status of the order is processed, the number of installments and the type of installments', async () => {
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
