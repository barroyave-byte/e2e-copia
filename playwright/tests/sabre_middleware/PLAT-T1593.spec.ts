import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { AplazoFormPage } from '@pages/explore/forms/aplazo/aplazoFormPage';
import { AplazoRedirectPage } from '@pages/bnpl/aplazoPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import {
  createSabreMerchant,
  getAuthorizeResult,
  getCaptureResult,
  SabreCredentials,
} from './common';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { expect, test } from '@support/fixtures';

test.describe('@regression feature to validate with the automated test case', () => {
  const configMerchant = new ConfigMerchant();

  test(
    '@PLAT-T1593 Should merge airline information purchase processed with aplazo properly',
    { tag: ['@admin_connection', '@admin-preprod', '@team_platform'] },
    async ({ page, sabreService }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const expectedStatus = 'processed';
      const passengers: any[] = [];
      let sabreMerchant: SabreCredentials;
      let result: any;
      let orderId: string;
      let orderToken: string;
      let merchantId: string;
      let merchantToken: string;
      let merchantName: string;
      let privateKey: string;
      let publicKey: string;
      let transactionId: string;

      await test.step('Should create a new merchant on DEUNA', async () => {
        const merchant = await configMerchant.basicSetup('MX');
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
        merchantName = merchant.merchantName;
        privateKey = merchant.privateKey;
        publicKey = merchant.publicKey;
        await apiCallNewman.createNetwork(merchantId, merchantToken);
        await apiCallNewman.createPaymentProcessor(
          processorsConfig.AplazoProcessorPayconnect,
          merchantId,
          merchantToken
        );
      });

      await test.step('Should open admin page and set merchant session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });
      await test.step('Should create sabre merchant', async () => {
        sabreMerchant = await createSabreMerchant(merchantId, privateKey, merchantToken);
      });

      await test.step('Should create order correctly on authorize', async () => {
        const soapResult = await sabreService.authorize({
          merchantAccountCode: sabreMerchant.merchantAccountCode,
          username: sabreMerchant.username,
          password: sabreMerchant.password,
          paymentMethodCode: 'BB420', // APM Online code from sabre merchant creation
          installments: '1',
          amount: '100.00',
          currencyCode: 'MXN',
          countryCode: 'MX',
          stateCode: 'CMX',
        });

        result = getAuthorizeResult(soapResult);

        expect(result).toBeDefined();
        expect(result.transactionId).toBeDefined();
        transactionId = result.transactionId;
      });

      await test.step('Should validate that auth response code is a redirection required code', async () => {
        expect(result.response['@_ResponseCode']).toBe('300');
        expect(result.response['@_Description']).toBe('Pending payment');
      });

      await test.step('Should validate that the redirect url is present and extract order token', async () => {
        const redirectUrl = result.response['RedirectURL'];
        if (!redirectUrl) {
          throw new Error('[ERROR] ----> Response value `RedirectURL` is empty');
        }
        const url = new URL(redirectUrl);
        orderToken = url.searchParams.get('orderToken');
        if (!orderToken) {
          throw new Error('[ERROR] ----> orderToken is not found in the RedirectURL');
        }

        console.log('[INFO] ----> Redirect URL: ', redirectUrl);
        console.log('[INFO] ----> Order Token: ', orderToken);
      });

      await test.step('Should validate that the order id is present', async () => {
        const id = result.orderId;
        expect(id).toBeDefined();
        expect(id).not.toBeNull();
        console.log('[INFO] ----> Order ID: ', id);

        orderId = result.orderId;
      });

      await test.step('Should validate that the request has two passengers with required fields', async () => {
        for (const passengerDetail of result.request.OrderDetail.PassengerDetail as any[]) {
          const passenger = {
            nameInPnr: passengerDetail['@_NameInPNR'],
            firstName: passengerDetail['@_FirstName'],
            lastName: passengerDetail['@_LastName'],
            type: passengerDetail['@_PsgrType'],
            gender: passengerDetail['@_Gender'],
            docType: passengerDetail.Document['@_DocType'],
            docNumber: passengerDetail.Document['@_DocNumber'],
          };

          Object.entries(passenger).forEach(([key, value]) => {
            expect(value, `Passenger ${key} should be present`).toBeDefined();
            expect(value, `Passenger ${key} should not be null`).not.toBeNull();
            expect(value, `Passenger ${key} should not be empty`).not.toBe('');
          });

          passengers.push(passenger);
        }
      });

      await test.step('Should open widget and pay with Aplazo', async () => {
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
          const popup = await aplazoRedirectPagePromise;
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
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(expectedStatus);
      });

      await test.step('Should partially capture order for both passengers', async () => {
        for (const passenger of passengers) {
          console.log('[INFO] ----> Capturing for passenger: ', passenger);

          const soapResult = await sabreService.capture({
            merchantAccountCode: sabreMerchant.merchantAccountCode,
            username: sabreMerchant.username,
            password: sabreMerchant.password,
            transactionId,
            amount: '50.00',
            currencyCode: 'MXN',
            passenger,
          });

          const captureResult = getCaptureResult(soapResult);
          expect(captureResult.response['@_ResponseCode']).toBe('0');
          expect(captureResult.response['@_Description']).toBe('Captured');
        }
      });
    }
  );
});
