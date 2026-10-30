import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { createSabreMerchant, getAuthorizeResult, SabreCredentials } from './common';
import { test, expect } from '@support/fixtures';
import { stripeVisaSuccessful } from '@support/interfaces/credit_cards';

test.describe('@regression feature to validate with the automated test case', () => {
  const configMerchant = new ConfigMerchant();

  test(
    '@PLAT-T1590 Should create order correctly on authorize',
    { tag: ['@team_platform'] },
    async ({ page, sabreService }) => {
      let orderToken: string;
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const expectedStatus = 'processed';
      let sabreMerchant: SabreCredentials;
      let result: any;
      let orderId: string;
      let merchantId: string;
      let merchantToken: string;
      let merchantName: string;
      let privateKey: string;

      await test.step('Should create a new merchant on DEUNA', async () => {
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

      await test.step('Should create sabre merchant', async () => {
        sabreMerchant = await createSabreMerchant(merchantId, privateKey, merchantToken);
      });

      await test.step('Should purchase order correctly on authorize', async () => {
        const soapResult = await sabreService.authorize({
          merchantAccountCode: sabreMerchant.merchantAccountCode,
          username: sabreMerchant.username,
          password: sabreMerchant.password,
          cardNumber: stripeVisaSuccessful.number,
          paymentMethodCode: 'VI',
          installments: '1',
          amount: '100.00',
          currencyCode: 'MXN',
          countryCode: 'MX',
          stateCode: 'CMX',
        });

        result = getAuthorizeResult(soapResult);
      });

      await test.step('Should validate that auth response code is a successful code', async () => {
        expect(result.response['@_ResponseCode']).toBe('0');
      });

      await test.step('Should validate that the order id is present', async () => {
        const id = result.orderId;
        expect(id).toBeDefined();
        expect(id).not.toBeNull();
        console.log('[INFO] ----> Order ID: ', id);

        orderId = result.orderId;
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
        orderToken = await adminOrdersPage.getTokenFromOrderFound(orderId);
        console.log('[INFO] ----> Order Token: ', orderToken);

        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(expectedStatus);
      });

      await test.step('Should validate that the order has the correct mapping values', async () => {
        const orderData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        expect(orderData.airlineInformation).not.toBeUndefined();
        expect(orderData.airlineInformation.booking_items.length).toBeGreaterThan(0);
        for (let bookingItem of orderData.airlineInformation.booking_items) {
          expect(bookingItem.passenger.type).toBe('ADT');
          for (let leg of bookingItem.legs) {
            expect(leg.stopover_code).toBe('O');
            expect(leg.service_class).toBe('F');
          }
        }
      });
    }
  );
});
