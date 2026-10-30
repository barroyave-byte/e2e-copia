import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import envConfig from '@support/envConfig';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { TelcelInquiryBodyBuilder } from '@support/http/testData/telcel/TelcelInquiryBodyBuilder';

const configMerchant = new ConfigMerchant();
let merchantId: string;
let merchantToken: string;
let privateKey: string;
let publicKey: string;
let merchantName: string;

const TELCEL_WEBHOOK_RESPONSE_TEMPLATE = `{ "order": { "order_id": "{{ .order.order_id }}", "metadata": { "additional_data.business_chain": "{{ index .order.metadata "additional_data.business_chain" }}", "additional_data.current_balance": "{{ index .order.metadata "additional_data.current_balance" }}", "additional_data.estimated_balance": "{{ index .order.metadata "additional_data.estimated_balance" }}", "additional_data.phone": "{{ index .order.metadata "additional_data.phone" }}", "additional_data.phone_number": "{{ index .order.metadata "additional_data.phone_number" }}", "additional_data.store_code": "{{ index .order.metadata "additional_data.store_code" }}", "additional_data.telcel_transaction_id": "{{ index .order.metadata "additional_data.telcel_transaction_id" }}", "additional_data.terminal": "{{ index .order.metadata "additional_data.terminal" }}" } } }`;

const TELCEL_WEBHOOK_RESPONSE_DATA = `{"order":{"order_id":"ord_aBcDeFgH12345","metadata":{"additional_data.business_chain":"MySupermarketChain","additional_data.current_balance":"150.75","additional_data.estimated_balance":"135.25","additional_data.phone":"+15551234567","additional_data.phone_number":"987654321","additional_data.store_code":"STORE-007","additional_data.telcel_transaction_id":"telcel_txn_zYxWvU987","additional_data.terminal":"T-800"}}}`;

test.describe('@regression feature to validate with the automated test case', () => {
  const expectedStatus = 'processed';

  test.beforeAll(async () => {
    const merchantResponse = await configMerchant.basicSetup('MX');
    merchantName = merchantResponse.merchantName;
    merchantId = merchantResponse.merchantId;
    merchantToken = merchantResponse.merchantToken;
    privateKey = merchantResponse.privateKey;
    publicKey = merchantResponse.publicKey;
    await apiCallNewman.createNetwork(merchantId, merchantToken);
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.stripeDirectProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PLAT-T1616 Should configure a merchant for telcel-middleware and getting sync notification when to do purchase',
    { tag: ['@team_platform'] },
    async ({ page, transactionTraceService, checkoutConfigurationService, telcelService }) => {
      let orderToken: string;
      let orderId: string;
      let merchantName: string;
      let transactionId: string;

      await test.step('Should configure merchant to create a payment on telcel-middleware', async () => {
        await checkoutConfigurationService.createConfigCheckoutV2({
          merchant_token: merchantToken,
          merchant_id: merchantId,
          config_checkout_v2_data: { order_config: { notify_type: 'sync' } },
        });

        await checkoutConfigurationService.createWebhook(merchantId, merchantToken, {
          event_name: 'sync_order_notification',
          active: true,
          error_response_template: '{"description":"{{ .code }}","message":"{{.message }}"}',
          fields_update: { fields: ['OrderID', 'Metadata'], custom_fields: null },
          headers: [
            { key: 'X-Api-Key', value: privateKey },
            { key: 'x-source', value: 'e2e-test' },
          ],
          http_method: 'POST',
          params: null,
          payload_template: null,
          propagate_response: false,
          query_params: null,
          response_body: { fields: ['Order'], custom_fields: null },
          response_template: TELCEL_WEBHOOK_RESPONSE_TEMPLATE,
          response_data: TELCEL_WEBHOOK_RESPONSE_DATA,
          url: envConfig.TELCEL_MIDDLEWARE_UR_NOTIFICATIONS,
        });

        const inquiryResponse = await telcelService.inquiry(TelcelInquiryBodyBuilder.build());
        const metadata = inquiryResponse.data.order.metadata;
        const balance = parseFloat(metadata['additional_data.current_balance'].replace(/^0+/, ''));
        const telcelTransactionId = metadata['additional_data.telcel_transaction_id'];
        const businessChain = metadata['additional_data.business_chain'];
        const storeCode = metadata['additional_data.store_code'];
        const phoneNumber = metadata['additional_data.phone_number'];

        const result = await telcelService.createOrder({
          merchantId,
          privateKey,
          balance,
          telcelTransactionId,
          businessChain,
          phoneNumber,
          storeCode,
        });

        orderToken = result.token;
        orderId = result.orderId;
        transactionId = result.transactionId;
      });

      await test.step('Should to do a successful purchase with the payment widget', async () => {
        if (!orderToken) {
          throw new Error('[ERROR] ----> Order token is empty');
        }
        console.log('[INFO] ----> order_token: ', orderToken);

        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget', true);
        await testingTool.setUpExplore({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        await testingTool.navigateToSelectOrderType();

        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.stripeVisaSuccessful, {
          country: 'MX',
        });
        await paymentDeunaNowPage.clickPay();
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(expectedStatus, 200);
      });

      await test.step('Order should exists in the orders list and must be processed', async () => {
        if (!orderId) {
          throw new Error('[ERROR] ----> Order id is empty');
        }
        console.log('[INFO] ----> order_id: ', orderId);

        const adminLoginPage = new AdminLoginPage(page);
        await adminLoginPage.gotoAdmin();

        const adminHomePage = new AdminHomePage(page);
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
        await adminHomePage.goToOrders();

        const adminOrdersPage = new AdminOrdersPage(page);
        await adminOrdersPage.assertPresenceInOrdersView();
        await adminOrdersPage.searchOrderByIdCaseSensitive(orderId);
        await adminOrdersPage.assertOrderFound(orderId);
        const token = await adminOrdersPage.getTokenFromOrderFound(orderId);

        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, token);
        await adminOrderDetailsPage.assertPaymentStatus(expectedStatus);
      });

      await test.step('Trace logs should contain the TELCEL event names', async () => {
        if (!transactionId) {
          throw new Error('[ERROR] ----> Transaction id is empty');
        }
        console.log('[INFO] ----> transaction_id: ', transactionId);

        const tvResult = await transactionTraceService.getTransactionVisibilityLogs(
          transactionId,
          'transaction_visibility',
          merchantId,
          merchantToken
        );

        const eventNameTelcel = 'action_13_payment_request';
        const traceLogs = tvResult.data as TraceLog[];
        const traceLogsEventNames = traceLogs
          .map((log: TraceLog) => log?.metadata?.transaction_visibility?.event_name)
          .filter(Boolean);

        const assureEventNames = [eventNameTelcel].every((eventName) =>
          traceLogsEventNames.includes(eventName)
        );

        if (!assureEventNames) {
          throw new Error(
            `[ERROR] ----> Not all assured event names are present in the trace logs. Expected: ${eventNameTelcel}, Found: ${traceLogsEventNames.join(', ')}`
          );
        }

        const found = traceLogs.find(
          (log) => log.metadata?.transaction_visibility?.event_name === eventNameTelcel
        );

        const success = found?.metadata?.transaction_visibility?.payload?.response_data?.success;

        if (!success) {
          throw new Error(
            `[ERROR] ----> The event 'action_13_payment_request' was found but returned success = false. Please verify the transaction response data.`
          );
        }
      });
    }
  );
});

interface TraceLog {
  metadata?: {
    transaction_visibility?: {
      event_name?: string;
      payload?: {
        response_data?: {
          success?: boolean;
          telcel_response?: string;
        };
      };
    };
  };
}
