import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as crypto from 'crypto';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';

const kushkiCard = creditCardData.kushkiVisaSuccessfull;

let configMerchant = new ConfigMerchant();
let transactionId: string;
let userEmail: string;

test.describe('@ADM-T490 Filter orders by', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, userAuthService, paymentService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId,
      merchantToken
    );

    for (let i = 0; i < 2; i++) {
      console.log(`Creating order ${i + 1}`);
      userEmail = `${crypto.randomUUID()}@testuser.com`;

      const tokenizeResult = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        order_id: `custom_order_${i}`,
        user_email: userEmail,
      });
      orderId = tokenizeResult.data.order.order_id;
      const orderToken = tokenizeResult.data.token;
      transactionId = tokenizeResult.data.order.order_id;

      const guestLoginResult = await userAuthService.loginAsGuest(merchantId, privateKey);
      await paymentService.purchase(privateKey, guestLoginResult.data.token, {
        token: orderToken,
        email: userEmail,
        processor_name: 'kushki',
        method_type: 'credit_card',
        store_code: 'all',
        credit_card: {
          card_holder_dni: '12345678',
          expiry_month: kushkiCard.expiration_date.substring(0, 2),
          expiry_year: `20${kushkiCard.expiration_date.substring(2, 4)}`,
          card_holder: 'APRO',
          card_number: kushkiCard.number,
          card_cvv: kushkiCard.cvv_code,
          address1: 'Santo Domingo 1',
          address2: '',
          zip: '1215',
          city: 'Santo Domingo',
          state: 'Distrito Nacional',
          country: 'CL',
          phone: '12345755',
        },
      } as any);

      console.log(`Order ID for order ${i + 1}: ${transactionId}`);
      console.log(`User email for order ${i + 1}: ${userEmail}`);
    }

    console.log(`Using the last transaction ID for Admin search: ${transactionId}`);
  });

  test(
    '@ADM-T490 Filtrar ordenes por order id en mayúsculas y garantizar que la búsqueda sea exitosa',
    { tag: ['@regression', '@admin', '@smoke', '@admin-preprod', '@team_admin', '@admin_smoke'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);

      await test.step('User logs into Admin and sets merchant session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('User goes to Orders view in Admin', async () => {
        await adminHomePage.goToOrders();
        await adminOrdersPage.assertPresenceInOrdersView();
      });

      await test.step('User searches the order by order ID', async () => {
        console.log(`Searching order with ID: ${transactionId}`);
        await adminOrdersPage.searchOrderById(transactionId);
        await adminOrdersPage.assertOrderFound(transactionId);
      });

      await test.step('Clear filters after Order ID search', async () => {
        await adminOrdersPage.clickClearFilters();
      });
    }
  );
});
