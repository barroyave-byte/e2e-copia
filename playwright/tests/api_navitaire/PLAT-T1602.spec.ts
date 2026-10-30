import { EmailGenerator } from '@support/utils/EmailGenerator';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { AplazoFormPage } from '@pages/explore/forms/aplazo/aplazoFormPage';
import { AplazoRedirectPage } from '@pages/bnpl/aplazoPage';
import {
  checkTraceLogs,
  createNavitaireMerchant,
  generateConfirmationId,
  generatePaymentId,
  getAuthorizeResult,
  NavitaireCredentials,
} from './common';
import { expect, test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

test.describe('@regression Successful purchase using APM', () => {
  test.fixme(
    '@PLAT-T1602 Should create an order and pay with APM',
    {
      tag: ['@team_platform', '@navitaire'],
      annotation: { type: 'bug', description: 'PLAT-6340' },
    },
    async ({ page, navitaireService }) => {
      const configMerchant = new ConfigMerchant();
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const paymentId = generatePaymentId();
      const confirmationId = generateConfirmationId();
      const orderId = `${confirmationId}_${paymentId}`;
      const expectedStatus = 'processed';
      let authorizeResult: any;
      let orderToken: string;
      let merchantId: string;
      let merchantToken: string;
      let merchantName: string;
      let privateKey: string;
      let publicKey: string;
      let navitaireMerchant: NavitaireCredentials;

      await test.step('Should create a new merchant on DEUNA configured with Stripe and able to make purchase v2 without user token', async () => {
        const merchant = await configMerchant.basicSetup('MX');
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
        merchantName = merchant.merchantName;
        privateKey = merchant.privateKey;
        publicKey = merchant.publicKey;
        await apiCallNewman.createPaymentProcessor(
          processorsConfig.aplazoProcessor,
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
          paymentMethod: 'GenericPaymentMethod',
          userEmail: EmailGenerator.generatePayerEmail(),
          installments: '1',
          amount: '100.0',
          currencyCode: 'MXN',
        });
        authorizeResult = getAuthorizeResult(response.data);

        expect(authorizeResult.ValidationResult.Succeeded).toBe(true);
        expect(authorizeResult.PaymentProcessingResult).toBe('PendingCustomerAction');
      });

      await test.step('Should validate that the order exists and is processed', async () => {
        const items = authorizeResult.PropertyBag.Items.NameValue;
        orderToken = items.find(
          (item: { Name: string; Value: string }) => item.Name === 'order_token'
        )?.Value;

        console.log(`[INFO] ----> navitaire_order_token: ${orderToken} `);

        expect(orderToken).toBeDefined();
      });

      await test.step('Should open the widget and pay with Aplazo', async () => {
        await test.step('Should open the testing page and the required form', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        const paymentPage = new AplazoFormPage(page);
        await test.step('Should selects Aplazo as a Payement Method', async () => {
          await paymentPage.selectAplazoForm();
        });

        let aplazoRedirectPage: AplazoRedirectPage;
        await test.step('Should click on the Pay button to open the redirect widget', async () => {
          const aplazoRedirectPagePromise = page.waitForEvent('popup');
          await paymentPage.clickPay();
          await page.waitForLoadState('networkidle'); // Wait for the main page to finish loading

          const popup = await aplazoRedirectPagePromise;
          await popup.waitForLoadState('domcontentloaded'); // Wait for popup to finish loading
          aplazoRedirectPage = new AplazoRedirectPage(popup);
        });

        await test.step('Should login in Aplazo page', async () => {
          await aplazoRedirectPage.sendPhonenumber();
          await aplazoRedirectPage.verifyOTPForAplazo();
        });

        await test.step('You should click on the Buy button to make the payment', async () => {
          await aplazoRedirectPage.clickOnButtonBuy();
        });

        await test.step('The thank you page should be displayed on the merchant', async () => {
          await paymentPage.assertThankyouPage('Pago completado');
        });
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
        const orderToken = await adminOrdersPage.getTokenFromOrderFound(orderId);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(expectedStatus);
      });

      await test.step('Should validate that the order has the correct items', async () => {
        const expectedOrderData = {
          order: {
            items: [
              {
                id: confirmationId,
                name: 'F: 1234 | O: EZE | D: MEX,F: 4321 | O: MEX | D: EZE',
                quantity: '1',
                total_amount: {
                  display_amount: 'MXN 100.00',
                },
                unit_price: {
                  display_amount: 'MXN 100.00',
                },
              },
            ],
          },
        };
        await adminOrderDetailsPage.assertOrderItems(expectedOrderData);
      });

      await test.step('Trace logs should contain navitaire middleware event names', async (step) => {
        const eventNames = ['tv_navitaire_authorize'];
        await checkTraceLogs(step, orderId, merchantId, merchantToken, eventNames);
      });
    }
  );
});
