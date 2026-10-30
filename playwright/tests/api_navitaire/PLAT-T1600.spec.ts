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

test.describe('@regression Refund a purchase fails', () => {
  test(
    '@PLAT-T1600 Should fail to refund a purchase for a declined payment',
    { tag: ['@team_platform', '@navitaire'] },
    async ({ page, navitaireService }) => {
      const configMerchant = new ConfigMerchant();
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const expectedStatus = 'denied';
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
      let reserveResult: any;

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
          cardNumber: creditCardData.stripeVisaFailed.number,
          userEmail: EmailGenerator.generatePayerEmail(),
          installments: '6',
          amount: '100.0',
          currencyCode: 'MXN',
        });
        authorizeResult = getAuthorizeResult(response.data);

        console.log('[INFO] ----> Authorize Result: ', authorizeResult);

        expect(authorizeResult.ValidationResult.Succeeded).toBe(false);
        expect(authorizeResult.ValidationResult.ValidationFailureReason).toContain(
          'DP-4102: Payment was declined'
        );
        expect(authorizeResult.PaymentProcessingResult).toBe('Declined');
      });

      await test.step('Should validate that auth response code is a error code', async () => {
        expect(authorizeResult.ValidationResult.Succeeded).toBe(false);
        expect(authorizeResult.PaymentProcessingResult).toBe('Declined');
      });

      await test.step('Should create order on authorize', async () => {
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
        orderToken = await adminOrdersPage.getTokenFromOrderFound(orderId);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(expectedStatus);
      });

      await test.step('Should fail to refund order on reverse', async () => {
        const reverseResponse = await navitaireService.reverse({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId: generatePaymentId(),
          confirmationId,
          originalPaymentId: paymentId,
        });
        reserveResult = getReverseResult(reverseResponse.data);
      });

      await test.step('Should validate that reverse response code is an unsuccessful code', async () => {
        expect(reserveResult.ValidationResult.Succeeded).toBe(false);
        expect(reserveResult.PaymentProcessingResult).toBe('Error');
      });

      await test.step('Should navigate to the order and it should have expected status', async () => {
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
