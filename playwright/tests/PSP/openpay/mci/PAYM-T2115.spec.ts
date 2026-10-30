import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
const globalAssert = new GlobalAssert();
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { defaultCampaignsMCI } from '@support/interfaces/campaigns/campaignsObject';

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
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      amount: 250000,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.openPayProcessor,
      merchantId,
      merchantToken
    );
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
      await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
      await adminConsolidatedFlows.configureInstallmentCampaign(defaultCampaignsMCI);
      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test(
    '@PAYM-T2115 - Purchase installments 3 meses with installments_plan_option_id OpenPay usuario invitado - DEUNA NOW',
    {
      tag: [
        '@payments_integration',
        '@installments',
        '@preprod',
        '@installments_mci_msi',
        '@team_payment_integration',
      ],
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const installments = '3';

      await test.step('User inserts Credit Card for DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.openpayVisaSuccessful, {
          country: 'MX',
        });
      });

      await test.step('User select MCI', async () => {
        await paymentDeunaNowPage.selectInstallmentsMCI(installments);
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the status of the order is processed, the number of installments and the type of installments', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
        await page.waitForTimeout(5000);
        await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
        await globalAssert.assertInstallmentsQuantity(installments, privateKey, orderToken);
        await globalAssert.assertInstallmentesType('MCI', privateKey, orderToken);
      });
    }
  );
});
