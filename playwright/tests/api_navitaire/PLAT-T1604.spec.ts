import { EmailGenerator } from '@support/utils/EmailGenerator';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import {
  checkTraceLogs,
  createNavitaireMerchant,
  generateConfirmationId,
  generatePaymentId,
  getAuthorizeResult,
  NavitaireCredentials,
} from './common';
import { expect, test } from '@support/fixtures';

test.describe('@regression Purchase using APM pending confirmation', () => {
  test(
    '@PLAT-T1604 Should create an order with status pending for APM',
    { tag: ['@team_platform', '@navitaire'] },
    async ({ page, navitaireService }) => {
      const configMerchant = new ConfigMerchant();
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const paymentId = generatePaymentId();
      const confirmationId = generateConfirmationId();
      const orderId = `${confirmationId}_${paymentId}`;
      const expectedStatus = 'pending';
      let orderToken: string;
      let merchantId: string;
      let merchantToken: string;
      let merchantName: string;
      let privateKey: string;
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

      await test.step('Create order on authorize', async () => {
        const response = await navitaireService.authorize({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId: paymentId,
          confirmationId: confirmationId,
          paymentMethod: 'GenericPaymentMethod',
          userEmail: EmailGenerator.generatePayerEmail(),
          installments: '1',
          amount: '100.0',
          currencyCode: 'MXN',
        });
        let authorizeResult = getAuthorizeResult(response.data);

        expect(authorizeResult.ValidationResult.Succeeded).toBe(true);
        expect(authorizeResult.PaymentProcessingResult).toBe('PendingCustomerAction');

        const items = authorizeResult.PropertyBag.Items.NameValue;
        orderToken = items.find(
          (item: { Name: string; Value: string }) => item.Name === 'order_token'
        )?.Value;
        expect(orderToken).toBeDefined();
      });

      await test.step('Should log into admin dashboard as merchant', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('Should navigate to the order and it should have expected status', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertOrderStatus(expectedStatus);
      });

      await test.step('Trace logs should contain navitaire middleware event names', async (step) => {
        const eventNames = ['tv_navitaire_authorize'];
        await checkTraceLogs(step, orderId, merchantId, merchantToken, eventNames);
      });
    }
  );
});
