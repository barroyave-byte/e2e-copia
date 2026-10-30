import { expect, test } from '@support/fixtures';

import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { makeRequest } from '@support/request_helper/requestUtil';
import envConfig from '@support/envConfig';
import * as refundData from '@support/interfaces/refund';
import * as refundDataV2 from '@support/interfaces/refundV2';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { getQAVerifyPostTransactionEventQuery } from '@support/request_helper/requestUtil';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';

test.describe('@regression Post-transaction api test', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('KUSHKI_PROCESSOR_CO');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PI-T1962 Transaction through post-transaction api is denied when the transaction cannot be refunded',
    { tag: ['@fraud', '@admin_connection', '@admin-preprod', '@team_payconnect'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');
      // Validate required environment variables
      expect(merchantId, 'merchantId is not set').toBeTruthy();
      expect(privateKey, 'the spec must tokenize with its own merchant private key').toBeTruthy();

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });
      await test.step('The user navigates to the payment screen as guest user', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('The user inserts a credit card', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.kushkiVisaSuccessfull, {
          country: 'CO',
        });
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully with status code "200" and status order "processed"', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('Attempt a refund that will be denied with 422 error', async () => {
        await apiCallNewman.refundOrderV2(
          refundDataV2.errorRefundForPostTransactionAPI,
          privateKey,
          500000,
          false,
          { orderToken: orderToken }
        );
      });

      await test.step('Transaction status remains as processed after denied refund', async () => {
        const status = 'processed';
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('It validates that when attempting to confirm a non-refundable transaction, it returns a 200 OK response', async () => {
        const transactionID = orderId;
        const merchantID = merchantId;

        // make request to post transaction webhook
        const response = await makeRequest(
          'POST',
          envConfig.BASE_URL_POSTMAN + '/post-transaction-manual-process/confirm',
          {
            headers: {
              'X-Api-Key': privateKey,
            },
            data: {
              merchant_id: merchantID,
              order_id: transactionID,
            },
          }
        );
        expect(response.status).toBe(200);
      });

      await test.step('Validate event manual review result', async () => {
        const eventManualReviewResult = 'accepted';
        const transactionID = orderId;
        const eventResponse = await getQAVerifyPostTransactionEventQuery(transactionID);
        expect(eventResponse.status).toBe(202);
        expect(eventResponse.body.data.rows.length).toBeGreaterThan(0);
        const eventData = eventResponse.body.data.rows[0];
        expect(eventData).toBeDefined();
        const actualEventManualReviewResult = eventData[9];
        expect(actualEventManualReviewResult).toEqual(eventManualReviewResult);
        console.log(
          'Event manual review result validated successfully:',
          actualEventManualReviewResult
        );
      });
    }
  );
});
