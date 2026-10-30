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
  getReverseResult,
  NavitaireCredentials,
} from './common';
import { expect, test } from '@support/fixtures';
import { retryGetOrderStatus } from '@support/utils/retries';

test.describe('@regression Successful refund a purchase', () => {
  test(
    '@PLAT-T1599 Should refund a purchase',
    { tag: ['@team_platform', '@navitaire'] },
    async ({ page, emaService, navitaireService }) => {
      const configMerchant = new ConfigMerchant();
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const expectedStatus = 'refunded';
      const paymentId = generatePaymentId();
      const confirmationId = generateConfirmationId();
      const orderId = `${confirmationId}_${paymentId}`;
      let navitaireMerchant: NavitaireCredentials;
      let orderToken: string;
      let merchantId: string;
      let merchantToken: string;
      let merchantName: string;
      let privateKey: string;
      let authorizeResult: any;
      let reverse: any;

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

      await test.step('Should create order correctly on authorize', async () => {
        const response = await navitaireService.authorize({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId,
          confirmationId,
          paymentMethod: 'CreditCardPaymentMethod',
          cardNumber: creditCardData.stripeVisaSuccessful.number,
          userEmail: EmailGenerator.generatePayerEmail(),
          installments: '1',
          amount: '100.0',
          currencyCode: 'MXN',
        });
        authorizeResult = getAuthorizeResult(response.data);
      });

      await test.step('Should validate that auth response code is a successful code', async () => {
        expect(authorizeResult.ValidationResult.Succeeded).toBe(true);
        expect(authorizeResult.PaymentProcessingResult).toBe('Approved');
      });

      await test.step('Should validate that the response contains the order token', async () => {
        orderToken = authorizeResult.PropertyBag.Items.NameValue.find(
          (item: { Name: string; Value: string }) => item.Name === 'order_token'
        )?.Value;
        expect(orderToken).toBeDefined();
      });

      await test.step('Should validate that the response contains the correct payment identification fields', async () => {
        const clientPaymentId = authorizeResult.PaymentIdentification.ClientPaymentId;
        expect(clientPaymentId).toBeDefined();
        expect(clientPaymentId).toBe(paymentId);

        const clientConfirmationId = authorizeResult.PaymentIdentification.ClientConfirmationId;
        expect(clientConfirmationId).toBeDefined();
        expect(clientConfirmationId).toBe(confirmationId);

        expect(orderId).toBe(`${clientConfirmationId}_${clientPaymentId}`);
      });

      await test.step('Should refund order correctly on reverse', async () => {
        // Navitaire answers the authorize before the payment has a status, and a reverse sent then
        // fails with NMS-1002 "payment status '' not supported for reverse" (430 ms later in run
        // regression-stg-41ba24a8).
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
        const reverseResponse = await navitaireService.reverse({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId: generatePaymentId(),
          confirmationId,
          originalPaymentId: paymentId,
        });
        reverse = getReverseResult(reverseResponse.data);
      });

      await test.step('Should validate that auth response code is a successful code', async () => {
        expect(reverse.ValidationResult.Succeeded).toBe(true);
        expect(reverse.PaymentProcessingResult).toBe('Approved');
      });

      await test.step('Should log into admin dashboard as merchant', async () => {
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
        const token = await adminOrdersPage.getTokenFromOrderFound(orderId);
        expect(token).toBe(orderToken);

        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(expectedStatus);
      });

      await test.step('Trace logs should contain navitaire middleware event names', async (step) => {
        const eventNames = ['tv_navitaire_authorize', 'tv_navitaire_notify'];
        await checkTraceLogs(step, orderId, merchantId, merchantToken, eventNames);
      });
    }
  );
});
