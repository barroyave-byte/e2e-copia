import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import {
  createSabreMerchant,
  getAuthorizeResult,
  getCancelOrRefundResult,
  getCaptureResult,
  getTraceLogs,
  SabreCredentials,
} from './common';
import { cybersourceAmexSuccessful } from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';

test.describe('@regression feature to validate with the automated test case', () => {
  test(
    '@PLAT-T1592 Should merge airline information purchase processed with stripe properly',
    { tag: ['@team_platform'] },
    async ({ page, sabreService }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const expectedAuthorized = 'authorized';
      const expectedCaptured = 'captured';
      const expectedRefunded = 'refunded';
      const passengers: any[] = [];
      let sabreMerchant: SabreCredentials;
      let result: any;
      let orderId: string;
      let merchantId: string;
      let merchantToken: string;
      let merchantName: string;
      let privateKey: string;
      let transactionId: string;

      await test.step('Should create a new merchant on DEUNA configured with Stripe, network and multicapture', async () => {
        const configMerchant = new ConfigMerchant();
        const merchant = await configMerchant.basicSetup('MX');
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
        merchantName = merchant.merchantName;
        privateKey = merchant.privateKey;
        await apiCallNewman.createNetwork(merchantId, merchantToken);
        await apiCallNewman.createMerchantStoreWithData(
          {
            timezone: 'America/Mexico_City',
            capture_cutoff_days: 7,
          },
          merchantId,
          merchantToken
        );
        await apiCallNewman.createPaymentProcessor(
          processorsConfig.stripeProcessorMultiCapture,
          merchantId,
          merchantToken
        );
      });

      await test.step('Should create sabre merchant', async () => {
        sabreMerchant = await createSabreMerchant(merchantId, privateKey, merchantToken);
      });

      await test.step('Should purchase order correctly on authorize', async () => {
        const soapResult = await sabreService.authorize({
          merchantAccountCode: sabreMerchant.merchantAccountCode,
          username: sabreMerchant.username,
          password: sabreMerchant.password,
          cardNumber: cybersourceAmexSuccessful.number,
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
        await adminOrderDetailsPage.assertPaymentStatus(expectedAuthorized);
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

      await test.step('Should validate the order is captured', async () => {
        await page.reload();
        await adminOrderDetailsPage.assertPaymentStatus(expectedCaptured);
      });

      await test.step('Should refund order', async () => {
        for (const passenger of passengers) {
          console.log('[INFO] ----> Refunding for passenger: ', passenger);

          const soapResult = await sabreService.cancelOrRefund({
            merchantAccountCode: sabreMerchant.merchantAccountCode,
            username: sabreMerchant.username,
            password: sabreMerchant.password,
            transactionId,
            amount: '50.00',
            currencyCode: 'MXN',
            passenger,
          });

          const refundResult = getCancelOrRefundResult(soapResult);
          expect(refundResult.response['@_ResponseCode']).toBe('0');
          expect(refundResult.response['@_Description']).toBe('Refunded');
        }
      });

      await test.step('Validate the order is refunded', async () => {
        await page.reload();
        await adminOrderDetailsPage.assertPaymentStatus(expectedRefunded);
      });

      await test.step('Should validate merging logic in transaction visibility', async () => {
        const logs = await getTraceLogs(orderId, merchantId, merchantToken);

        // Assert captures
        const captureInfos = logs
          .filter(
            (entry: any) =>
              entry?.metadata?.transaction_visibility?.event_name === 'tv_processing_capture'
          )
          .map(
            (entry: any) =>
              entry.metadata?.transaction_visibility?.payload?.request_data?.airline_information
          );
        expect(captureInfos.length).toBe(passengers.length);
        expect(captureInfos.every((info: any) => !!info)).toBeTruthy();

        for (const passenger of passengers) {
          const airlineInformation = captureInfos.find(({ booking_items: bookingItems }) => {
            if (!bookingItems) return false;

            for (const bookingItem of bookingItems) {
              if (
                bookingItem.passenger?.first_name === passenger.firstName &&
                bookingItem.passenger?.last_name === passenger.lastName
              ) {
                return true;
              }
            }
            return false;
          });
          expect(airlineInformation).toBeDefined();

          const bookingItems = airlineInformation!.booking_items;
          expect(bookingItems!.length).toBe(1);
          expect(bookingItems![0].ticket_number).toBe(passenger.docNumber);
        }

        // Assert refunds
        const refundInfos = logs
          .filter(
            (entry: any) =>
              entry?.metadata?.transaction_visibility?.event_name === 'tv_processing_refund'
          )
          .map(
            (entry: any) =>
              entry.metadata?.transaction_visibility?.payload?.request_data?.airline_information
          );
        expect(refundInfos.length).toBe(passengers.length);
        expect(refundInfos.every((info: any) => !!info)).toBeTruthy();

        for (const passenger of passengers) {
          const airlineInformation = refundInfos.find(({ booking_items: bookingItems }) => {
            if (!bookingItems) return false;

            for (const bookingItem of bookingItems) {
              if (
                bookingItem.passenger?.first_name === passenger.firstName &&
                bookingItem.passenger?.last_name === passenger.lastName
              ) {
                return true;
              }
            }
            return false;
          });
          expect(airlineInformation).toBeDefined();

          const bookingItems = airlineInformation!.booking_items;
          expect(bookingItems!.length).toBe(1);
          expect(bookingItems![0].ticket_number).toBe(passenger.docNumber);
        }
      });
    }
  );
});
