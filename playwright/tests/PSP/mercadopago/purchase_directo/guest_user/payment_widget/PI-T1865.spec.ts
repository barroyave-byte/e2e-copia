import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import * as crypto from 'crypto';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';

const configMerchant = new ConfigMerchant();

test.describe('@regression Pays with MercadoPago', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('CL');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('CL', privateKey, {
      user_email: 'test@testuser.com',
    });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessorChile,
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

  test(
    '@PI-T1865 MercadoPago Final Status must be displayed in the admin in the history section of the order.',
    { tag: ['@test_base', '@payments_integration', '@team_payment_integration'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const status = 'processed';

      await test.step('The user inserts a credit card ', async () => {
        await paymentDeunaNowPage.userGuest();
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.mercadopagoMasterCardSuccessful,
          { country: 'CL' }
        );
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully with status code "200"', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
      });

      await test.step('The user goes to orders and verify processor logo', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminHomePage.goToOrders();
        await adminOrdersPage.assertProcessorLogoIsVisible(ConnectionsAvailable.mercadopago);
      });

      await test.step('Validate that the order has status order "processed"', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('Validate status must be displayed in the history section of the order', async () => {
        await adminOrderDetailsPage.assertPaymentHistoryStatus(status);
      });
    }
  );
});
