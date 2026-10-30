import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';

const configMerchant = new ConfigMerchant();

test.describe('@regression Cybersource Purchase US', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('US');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    publicKey = merchantConfig.publicKey;
    const tokenized = await emaService.tokenizeAirlineOrder('US', merchantConfig.privateKey, {
      amount: 1000,
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.cybersourceProcessor_US,
      merchantId,
      merchantToken
    );
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

  test.fixme(
    '@PI-T2179 Successful airline purchase via Cybersource in the USA',
    {
      tag: ['@payments_integration', '@team_payment_integration', '@preprod', '@purchase'],
      annotation: { type: 'bug', description: 'PI-6283' },
    },
    async ({ page }) => {
      const deunaNowPage = new PaymentDeunaNowPage(page, 'EN');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'EN');

      await test.step('The user enters the credit card information of the Cybersourse Visa', async () => {
        await deunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.cybersourceVisaCardSuccessful,
          {
            country: 'US',
          }
        );
      });

      await test.step('The user clicks pay', async () => {
        await deunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully with status processing', async () => {
        const status = 'processing';
        await deunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
