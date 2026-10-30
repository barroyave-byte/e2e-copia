import { test } from '@support/fixtures';

// Page Objects
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';

// Support Utilities
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

// Interfaces and Data
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';

const configMerchant = new ConfigMerchant();
let orderToken: string;
let merchantId: string;
let merchantToken: string;
let merchantName: string;
let privateKey: string;
let publicKey: string;
let orderId: string;

test.describe('@regression Worldpay Payment Capture via Webhook', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('PE');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const resp = await emaService.tokenizeDeunaNowOrder('PE', privateKey);
    orderId = resp.data.order.order_id;
    orderToken = resp.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.worldpayProcessorPayconnectAuthorize_PE,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1213 Successful capture with WorldPay using the payment widget - and total order captured via webhook in PE',
    {
      tag: [
        '@payments_integration',
        '@admin_connection',
        '@smoke',
        '@admin-preprod',
        '@team_payment_integration',
        '@fixme_preprod',
      ],
    },
    async ({ page, paymentService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);

      await test.step('Step 1: Open admin page and set merchant session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });
      await test.step('Step 4: Navigate to payment widget', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        // Worldpay rejects an empty fingerprint: with no fraud provider the widget sends
        // device_id = base64("{}") = "e30=", and Worldpay answers
        // 'Attribute value "e30=" of type NMTOKEN must be a name token'. MercadoPago needs
        // no credentials and is here only to produce a non-empty device_id — the test is
        // about the Worldpay purchase, not about fraud. Bridge until the platform stops
        // forwarding a raw, non-NMTOKEN-safe device_id to Worldpay.
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          antiFraudProviders: { MERCADOPAGO: {} },
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('Step 5: Fill credit card information in payment widget', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.worldpayMasterCardSuccessful,
          { country: 'PE' }
        );
      });

      await test.step('Step 6: Submit payment to initiate authorization', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Step 7: Verify payment is authorized successfully', async () => {
        const status = 'authorized';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('Step 8: Initiate capture process for authorized transaction', async () => {
        await adminOrderDetailsPage.captureTotalOrder();
        const status = 'capturing';
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('Step 9: Process webhook to complete capture and verify final status', async () => {
        await paymentService.simulateWorldpayWebhook(
          orderToken,
          processorsConfig.worldpayProcessorPayconnect.name,
          merchantId,
          'CAPTURED',
          privateKey
        );
        const status = 'captured';
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
