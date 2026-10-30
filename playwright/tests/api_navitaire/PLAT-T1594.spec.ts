import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminCommercePage } from '@pages/admin/commerce/adminCommercePage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import {
  checkTraceLogs,
  generateConfirmationId,
  generatePaymentId,
  getAuthorizeResult,
} from './common';
import { createNavitaireMerchant, NavitaireCredentials } from './common';
import { expect, test } from '@support/fixtures';
import { sleep } from '@tests/order_builder/order_functions';

test.describe('@regression Purchase with fraud status', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test(
    '@PLAT-T1594 Should handle post purchase validation correctly',
    { tag: ['@team_platform', '@navitaire'] },
    async ({ page, navitaireService }) => {
      const configMerchant = new ConfigMerchant();
      const adminCommercePage = new AdminCommercePage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page);
      const paymentId = generatePaymentId();
      const confirmationId = generateConfirmationId();
      const orderId = `${confirmationId}_${paymentId}`;
      const expectedStatus = 'denied';

      let navitaireMerchant: NavitaireCredentials;

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

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user configure a new connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.cybersourceFraud,
          processorsConfig.cybersourceFraudProcessor
        );
      });

      await test.step('The user goes to commerce to activate general fraud adjusts', async () => {
        await adminHomePage.goToCommerce();
        await adminCommercePage.activateManualReview();
        await adminCommercePage.activateOpsAutoExecution();
      });

      await test.step('The user select payment strategy', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      await test.step('The user create specific rules', async () => {
        await adminPaymentStrategyPage.editDefaultRouting(ConnectionsAvailable.cybersourceFraud, [
          {
            riskLevel: 'low',
            action: 'process',
            processor: {
              name: ConnectionsAvailable.stripeDirect,
              validateCvv: true,
              require3ds: false,
              actionForProcessor: 'decline',
            },
          },
        ]);
      });

      await test.step('Should create a new merchant on navitaire middleware', async () => {
        navitaireMerchant = await createNavitaireMerchant(merchantId, privateKey, merchantToken);
      });

      await test.step('Should create order on authorize', async () => {
        await sleep(5000); // wait for fraud settings to propagate

        const response = await navitaireService.authorize({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId,
          confirmationId,
          paymentMethod: 'CreditCardPaymentMethod',
          cardNumber: creditCardData.stripeVisaSuccessfulFraudReprove.number,
          userEmail: 'reject@deuna.com',
          installments: '6',
          amount: '100.0',
          currencyCode: 'MXN',
        });

        const authorizeResult = getAuthorizeResult(response.data);
        expect(authorizeResult.ValidationResult.Succeeded).toBe(false);
        expect(authorizeResult.ValidationResult.ValidationFailureReason).toContain(
          'FRD-7000: Payment was declined'
        );
        expect(authorizeResult.ValidationResult.ValidationFailureReason).toContain(
          'FRD-7000: Payment failed due to a possible fraud'
        );
        expect(authorizeResult.ResponseMessage).toContain('NMS-1001');
        expect(authorizeResult.ResponseMessage).toContain('payment declined');
        expect(authorizeResult.PaymentProcessingResult).toBe('Hot');
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
        const orderToken = await adminOrdersPage.getTokenFromOrderFound(orderId);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(expectedStatus);
      });

      await test.step('Trace logs should contain navitaire middleware event names', async (step) => {
        const eventNames = [
          'tv_navitaire_authorize',
          'tv_navitaire_notify', // should be present for fraudulent denied orders
        ];
        await checkTraceLogs(step, orderId, merchantId, merchantToken, eventNames);
      });
    }
  );
});
