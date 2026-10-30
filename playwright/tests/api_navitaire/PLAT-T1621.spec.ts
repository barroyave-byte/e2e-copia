import { EmailGenerator } from '@support/utils/EmailGenerator';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import {
  checkTraceLogs,
  createNavitaireMerchant,
  generateConfirmationId,
  generatePaymentId,
  getAuthorizeResult,
  NavitaireCredentials,
} from './common';
import { expect, test } from '@support/fixtures';
import { retryGetOrderStatus } from '@support/utils/retries';

const configMerchant = new ConfigMerchant();

test.describe('@regression Successful purchase overwrites order using property bag email', () => {
  let navitaireMerchant: NavitaireCredentials;
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let authorizeResult: any;

  test(
    '@PLAT-T1621 | Authorize overwrites the order and uses the contact_email property bag value as payer email',
    { tag: ['@team_platform', '@navitaire'] },
    async ({ page, emaService, navitaireService }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const expectedStatus = 'processed';
      const paymentId = generatePaymentId();
      const confirmationId = generateConfirmationId();
      const orderId = `${confirmationId}_${paymentId}`;
      const originalEmail = EmailGenerator.generatePayerEmail();
      const originalAmount = 5000; // 50.00 MXN on order creation
      const amount = 100; // 100.00 MXN on navitaire authorize
      const addressEmail = EmailGenerator.generatePayerEmail();
      const contactEmail = EmailGenerator.generatePayerEmail();

      await test.step('Should create a new merchant on DEUNA configured with Stripe and able to make purchase v2 without user token', async () => {
        const merchant = await configMerchant.basicSetup('MX');
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
        merchantName = merchant.merchantName;
        privateKey = merchant.privateKey;
        await apiCallNewman.createPaymentProcessor(
          processorsConfig.stripeProcessor,
          merchantId,
          merchantToken
        );
        await apiCallNewman.createNetwork(merchantId, merchantToken);
      });

      await test.step('Should create a new merchant on navitaire middleware', async () => {
        navitaireMerchant = await createNavitaireMerchant(merchantId, privateKey, merchantToken);
      });

      await test.step('Should create basic order', async () => {
        const createOrderResponse = await emaService.createNavitaireOrder(privateKey, {
          order_id: crypto.randomUUID(),
          amount: originalAmount,
          currency: 'MXN',
          countryCode: 'MX',
          userEmail: originalEmail,
        });

        expect(createOrderResponse.data.order).toBeDefined();
        expect(createOrderResponse.data.token).toBeDefined();
        orderToken = createOrderResponse.data.token;

        console.log(`[INFO] ----> order_token: ${orderToken} `);
      });

      await test.step('Should perform purchase on authorize', async () => {
        const response = await navitaireService.authorize({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId,
          confirmationId,
          paymentMethod: 'CreditCardPaymentMethod',
          cardNumber: creditCardData.stripeVisaSuccessful.number,
          userEmail: addressEmail,
          installments: '1',
          amount: amount.toString(),
          currencyCode: 'MXN',
          orderToken,
          contactEmail,
        });
        authorizeResult = getAuthorizeResult(response.data);
      });

      await test.step('Should validate that the order token remains the same', async () => {
        const nameValueItem = authorizeResult.PropertyBag.Items.NameValue.find(
          (item: { Name: string; Value: string }) => item.Name === 'order_token'
        );
        expect(nameValueItem).toBeDefined();
        expect(nameValueItem?.Value).toBe(orderToken);
      });

      await test.step('Should validate that auth response code is a successful code', async () => {
        expect(authorizeResult.ValidationResult.Succeeded).toBe(true);
        expect(authorizeResult.PaymentProcessingResult).toBe('Approved');
      });

      await test.step('Should have the correct email on each field', async () => {
        // Read after the payment is processed: before that the order has no payment customer email.
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
        const result = await emaService.getOrder(privateKey, orderToken);
        const response = result.data;
        expect(response.order.billing_address.email).toBe(addressEmail);
        expect(response.order.payment.data.customer.email).toBe(contactEmail);
        expect(response.order.total_amount).toBe(amount * 100);
        expect(response.order.order_id).toBe(orderId);
      });

      await test.step('Should set merchant session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('User goes to Orders view in Admin', async () => {
        await adminHomePage.goToOrders();
        await adminOrdersPage.assertPresenceInOrdersView();
      });

      await test.step('Should search the order and find it', async () => {
        await adminOrdersPage.searchOrderByIdCaseSensitive(orderId);
      });

      await test.step('Should find the order in the order list', async () => {
        await adminOrdersPage.assertFilterNotDisplayLabelNotAvailableInfo();
        await adminOrdersPage.assertOrderFound(orderId);
      });

      await test.step('Should navigate to the order and it should have expected status', async () => {
        const foundOrderToken = await adminOrdersPage.getTokenFromOrderFound(orderId);
        expect(foundOrderToken).toBe(orderToken);

        await adminOrderDetailsPage.goToOrderDetails(merchantId, foundOrderToken);
        await adminOrderDetailsPage.assertPaymentStatus(expectedStatus);
      });

      await test.step('Trace logs should contain navitaire middleware event names', async (step) => {
        const eventNames = ['tv_navitaire_authorize'];
        await checkTraceLogs(step, orderId, merchantId, merchantToken, eventNames);
      });
    }
  );
});
