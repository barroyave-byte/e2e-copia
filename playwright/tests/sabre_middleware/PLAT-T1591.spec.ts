import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import {
  createSabreMerchant,
  getAuthorizeResult,
  getCancelOrRefundResult,
  getTraceLogs,
  SabreCredentials,
} from './common';
import { sleep } from '@tests/order_builder/order_functions';
import { test, expect } from '@support/fixtures';
import { worldpayMasterCardSuccessful } from '@support/interfaces/credit_cards';

test.describe('@regression feature to validate with the automated test case', () => {
  const configMerchant = new ConfigMerchant();

  test(
    '@PLAT-T1591 Should merge airline information purchase processed with worldpay properly',
    { tag: ['@admin_connection', '@admin-preprod', '@team_platform'] },
    async ({ page, sabreService }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const authorizedStatus = 'authorized';
      const cancelledStatus = 'voided';
      let result: any;
      let sabreMerchant: SabreCredentials;
      let transactionId: string;
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
        await apiCallNewman.createNetwork(merchantId, merchantToken);
        await apiCallNewman.createPaymentProcessor(
          processorsConfig.worldpayProcessorPayconnectAuthorize_MX,
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

      await test.step('Should purchase order correctly on authorize', async () => {
        const soapResult = await sabreService.authorize({
          merchantAccountCode: sabreMerchant.merchantAccountCode,
          username: sabreMerchant.username,
          password: sabreMerchant.password,
          cardNumber: worldpayMasterCardSuccessful.number,
          paymentMethodCode: 'AX',
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
        const orderToken = await adminOrdersPage.getTokenFromOrderFound(orderId);
        console.log('[INFO] ----> Order Token: ', orderToken);

        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(authorizedStatus);
      });

      await test.step('Should refund order', async () => {
        await sleep(5000); // wait for the transaction to be fully processed before refunding

        const soapResult = await sabreService.cancelOrRefund({
          merchantAccountCode: sabreMerchant.merchantAccountCode,
          username: sabreMerchant.username,
          password: sabreMerchant.password,
          transactionId,
          amount: '100.00',
          currencyCode: 'MXN',
        });

        const refundResult = getCancelOrRefundResult(soapResult);
        expect(refundResult.response['@_ResponseCode']).toBe('0');
        expect(refundResult.response['@_Description']).toBe('Voided');
      });

      await test.step('Should validate order is voided', async () => {
        await page.reload();
        await adminOrderDetailsPage.assertPaymentStatus(cancelledStatus);
      });

      await test.step('Should validate merging logic in transaction visibility', async () => {
        const logs = await getTraceLogs(orderId, merchantId, merchantToken);

        const voidTraces = logs.filter(
          (entry: any) =>
            entry?.metadata?.transaction_visibility?.event_name === 'tv_processing_void'
        );
        expect(voidTraces.length).toBe(1);

        const bookingItems =
          voidTraces[0].metadata.transaction_visibility.payload?.request_data?.airline_information
            ?.booking_items;
        expect(bookingItems.length).toBe(2);

        let passengerExpectations: any[] = [];
        for (const passenger of result.request.OrderDetail.PassengerDetail) {
          passengerExpectations.push(
            expect.objectContaining({
              e_ticket: true,
              passenger: expect.objectContaining({
                first_name: passenger['@_FirstName'],
                last_name: passenger['@_LastName'],
                type: 'ADT',
              }),
              pnr: result.recordLocator,
              ticket_number: passenger.Document?.['@_DocNumber'],
            })
          );
        }

        expect(bookingItems).toEqual(expect.arrayContaining(passengerExpectations));
      });
    }
  );
});
