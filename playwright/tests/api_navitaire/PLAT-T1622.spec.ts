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

const configMerchant = new ConfigMerchant();

test.describe('@regression Successful split payment purchase enriches request from previous order', () => {
  let navitaireMerchant: NavitaireCredentials;
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let authorizeResults: any;

  test(
    '@PLAT-T1622 | Authorize split payments should enrich from order not reuse the token',
    {
      tag: ['@team_platform', '@navitaire'],
    },
    async ({ page, emaService, navitaireService }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const expectedStatus = 'processed';
      const paymentId1 = generatePaymentId();
      const paymentId2 = generatePaymentId();
      const confirmationId = generateConfirmationId();
      const orderIds = [`${confirmationId}_${paymentId1}`, `${confirmationId}_${paymentId2}`];
      const originalEmail = EmailGenerator.generatePayerEmail();
      const originalAmount = 5000; // 50.00 MXN on order creation
      const amount = 100; // 100.00 MXN on navitaire authorize
      const addressEmail = EmailGenerator.generatePayerEmail();

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
        // split payment sequence: 1
        const request1 = navitaireService.authorize({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId: paymentId1,
          confirmationId,
          paymentMethod: 'CreditCardPaymentMethod',
          cardNumber: creditCardData.stripeVisaSuccessful.number,
          userEmail: addressEmail,
          installments: '1',
          amount: amount.toString(),
          currencyCode: 'MXN',
          orderToken,
          splitPaymentSequence: '1',
        });
        const request2 = navitaireService.authorize({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId: paymentId2,
          confirmationId,
          paymentMethod: 'CreditCardPaymentMethod',
          cardNumber: creditCardData.stripeVisaSuccessful.number,
          userEmail: addressEmail,
          installments: '1',
          amount: amount.toString(),
          currencyCode: 'MXN',
          orderToken,
          splitPaymentSequence: '2',
        });

        const results = await Promise.all([request1, request2]);
        authorizeResults = results.map((r) => getAuthorizeResult(r.data));
      });

      for (const authorizeResult of authorizeResults) {
        await test.step('Should validate that the order token is different', async () => {
          const nameValueItem = authorizeResult.PropertyBag.Items.NameValue.find(
            (item: { Name: string; Value: string }) => item.Name === 'order_token'
          );
          expect(nameValueItem).toBeDefined();
          expect(nameValueItem?.Value).not.toBe(orderToken);
        });

        await test.step('Should validate that auth response code is a successful code', async () => {
          expect(authorizeResult.ValidationResult.Succeeded).toBe(true);
          expect(authorizeResult.PaymentProcessingResult).toBe('Approved');
        });

        await test.step('Should have the correct email on each field', async () => {
          const orderToken = authorizeResult.PropertyBag.Items.NameValue.find(
            (item: { Name: string; Value: string }) => item.Name === 'order_token'
          )?.Value;
          if (!orderToken) {
            throw new Error('order_token not found in authorize result');
          }

          const result = await emaService.getOrder(privateKey, orderToken);
          const response = result.data;
          expect(response.order.billing_address.email).toBe(addressEmail);
          expect(response.order.payment.data.customer.email).toBe(originalEmail);
          expect(response.order.total_amount).toBe(amount * 100);
          expect(orderIds).toContain(response.order.order_id);
        });
      }

      await test.step('Should set merchant session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      for (const orderId of orderIds) {
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
          await adminOrderDetailsPage.goToOrderDetails(merchantId, foundOrderToken);
          await adminOrderDetailsPage.assertPaymentStatus(expectedStatus);
        });

        await test.step('Trace logs should contain navitaire middleware event names', async (step) => {
          const eventNames = ['tv_navitaire_authorize'];
          await checkTraceLogs(step, orderId, merchantId, merchantToken, eventNames);
        });
      }
    }
  );
});
