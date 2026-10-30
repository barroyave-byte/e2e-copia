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
  createNavitaireMerchant,
  generateConfirmationId,
  generatePaymentId,
  getAuthorizeResult,
  getReverseResult,
  NavitaireCredentials,
} from '@tests/api_navitaire/common';
import { expect, test } from '@support/fixtures';

test.describe('@regression Navitaire', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test(
    '@PLAT-T1608 Should return valid codes',
    { tag: ['@team_platform', '@navitaire'] },
    async ({ page, navitaireService }) => {
      const configMerchant = new ConfigMerchant();
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const paymentId = generatePaymentId();
      const confirmationId = generateConfirmationId();
      const orderId = `${confirmationId}_${paymentId}`;
      const expectedStatus = 'processed';
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

      await test.step('Should create a new merchant on navitaire middleware', async () => {
        navitaireMerchant = await createNavitaireMerchant(merchantId, privateKey, merchantToken);
      });

      await test.step('Execute authorize - Approved (20)', async () => {
        const response = await navitaireService.authorize({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId: paymentId,
          confirmationId: confirmationId,
          paymentMethod: 'CreditCardPaymentMethod',
          cardNumber: creditCardData.stripeVisaSuccessful.number,
          userEmail: EmailGenerator.generatePayerEmail(),
          installments: '1',
          amount: '100.0',
          currencyCode: 'MXN',
        });

        let authorizeResult = getAuthorizeResult(response.data);
        expect(authorizeResult.ValidationResult.Succeeded).toBe(true);
        expect(authorizeResult.PaymentProcessingResult).toBe('Approved');
      });

      await test.step('Execute reverse with invalid amount - Error (10)', async () => {
        const reverseResponse = await navitaireService.reverse({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId: generatePaymentId(),
          confirmationId: confirmationId,
          originalPaymentId: paymentId,
          refundAmount: '200.00',
        });

        let reverseResult = getReverseResult(reverseResponse.data);
        console.log('Reverse result:', reverseResult);

        expect(reverseResult.ValidationResult.Succeeded).toBe(false);
        expect(reverseResult.PaymentProcessingResult).toBe('Declined');
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
        await adminOrderDetailsPage.assertPaymentStatus(expectedStatus);
      });
    }
  );
});
