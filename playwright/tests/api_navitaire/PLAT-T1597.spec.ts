import { EmailGenerator } from '@support/utils/EmailGenerator';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import {
  checkTraceLogs,
  createNavitaireMerchant,
  generateConfirmationId,
  generatePaymentId,
  getAuthorizeResult,
  NavitaireCredentials,
} from './common';
import { expect, test } from '@support/fixtures';

test.describe('@regression Create a purchase 3ds success', () => {
  let merchantId: string;
  let merchantToken: string;

  let merchantName: string;

  let privateKey: string;

  test(
    '@PLAT-T1597 Should create an order and pay with credit card - 3DS success',
    { tag: ['@team_platform', '@navitaire'] },
    async ({ page, navitaireService }) => {
      const configMerchant = new ConfigMerchant();
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const confirmationId = generateConfirmationId();
      const paymentId = generatePaymentId();
      const orderId = `${confirmationId}_${paymentId}`;
      const expectedStatus = 'processed';
      let navitaireMerchant: NavitaireCredentials;
      let authorizeResult: any;
      let challengeURL: string;

      await test.step('Should create a new merchant on DEUNA configured with Stripe and able to make purchase v2 without user token', async () => {
        const merchant = await configMerchant.basicSetup('MX');
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
        merchantName = merchant.merchantName;
        privateKey = merchant.privateKey;
        await apiCallNewman.createPaymentProcessor(
          processorsConfig.stripe3dsProcessor,
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
          cardNumber: creditCardData.stripe3dsPass.number,
          userEmail: EmailGenerator.generatePayerEmail(),
          installments: '6',
          amount: '100.0',
          currencyCode: 'MXN',
        });
        authorizeResult = getAuthorizeResult(response.data);

        expect(authorizeResult.ValidationResult.Succeeded).toBe(true);
        expect(authorizeResult.PaymentProcessingResult).toBe('PendingCustomerAction');
      });

      await test.step('Should obtain 3DS challenge URL from authorize', async () => {
        challengeURL = authorizeResult.PropertyBag.Items.NameValue.find(
          (item: { Name: string; Value: string }) => item.Name === 'next_action_url'
        )?.Value;
        const nextAction = authorizeResult.PropertyBag.Items.NameValue.find(
          (item: { Name: string; Value: string }) => item.Name === 'next_action'
        )?.Value;

        expect(challengeURL).toBeDefined();
        expect(nextAction).toBeDefined();
      });

      await test.step('Should complete Stripe challenge successfully', async () => {
        const page3DS = await page.context().newPage();
        await page3DS.goto(challengeURL, { waitUntil: 'domcontentloaded' });
        const challenge3ds = new Challenge3dsPage(page3DS);
        await challenge3ds.selectPassChallengeStripe();
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
        const orderToken = await adminOrdersPage.getTokenFromOrderFound(orderId);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(expectedStatus, 4, 10000);
      });

      await test.step('Trace logs should contain navitaire middleware event names', async (step) => {
        const eventNames = [
          'tv_navitaire_authorize',
          'tv_navitaire_notify', // should be present since it's a 3ds approved order
        ];
        await checkTraceLogs(step, orderId, merchantId, merchantToken, eventNames);
      });
    }
  );
});
