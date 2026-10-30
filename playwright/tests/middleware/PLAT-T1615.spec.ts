import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import envConfig from '@support/envConfig';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { VtexMiddlewareConfig } from '@support/http/testData/vtex_middleware/VtexMiddlewareConfig';

const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate with the automated test case', () => {
  const expectedStatus = 'processed';
  let orderToken: string;
  let orderId: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let transactionId: string;

  test.fixme(
    '@PLAT-T1615 Should configure a merchant for vtex-middleware and perform purchase with sync notification',
    {
      annotation: { type: 'bug', description: 'PLAT-6410' },
      tag: ['@platforms', '@vtex', '@team_platform'],
    },
    async ({
      page,
      transactionTraceService,
      checkoutConfigurationService,
      merchantAuthService,
      emaService,
      vtexMiddlewareService,
    }) => {
      await test.step('Should create a new merchant on DEUNA configured with Stripe', async () => {
        const merchant = await configMerchant.basicSetup('CO');
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
        merchantName = merchant.merchantName;
        privateKey = merchant.privateKey;
        publicKey = merchant.publicKey;
        await apiCallNewman.createPaymentProcessor(
          processorsConfig.stripeProcessor,
          merchantId,
          merchantToken
        );
      });

      await test.step('Should configure merchant to create a payment on vtex-middleware', async () => {
        // 1. Custom fields
        const customFields = VtexMiddlewareConfig.customFields();
        for (const field of customFields) {
          await checkoutConfigurationService.createCustomField(field, merchantId, merchantToken);
        }

        const customFieldsResponse = await checkoutConfigurationService.getCustomFields(
          merchantId,
          merchantToken
        );
        const customFieldsData = (customFieldsResponse.data as any).data as any[];
        const actualFieldNames = customFieldsData.map((item: any) => item.field_name);
        const expectedFieldNames = ['order_form_id', 'vtex_chko_auth', 'checkout_data_access'];
        for (const name of expectedFieldNames) {
          if (!actualFieldNames.includes(name)) {
            throw new Error(`Expected custom field '${name}' not found`);
          }
        }

        // 2. External endpoints
        const endpoints = VtexMiddlewareConfig.externalEndpoints(merchantId);

        await merchantAuthService.addExternalEndpoint(
          merchantId,
          merchantToken,
          endpoints.vtexCart
        );
        const vtexCartEndpoint = await merchantAuthService.getExternalEndpoint(
          privateKey,
          'VtexCart'
        );
        if ((vtexCartEndpoint.data as any).config_type !== 'VtexCart') {
          throw new Error('VtexCart external endpoint config_type mismatch');
        }

        await merchantAuthService.addExternalEndpoint(
          merchantId,
          merchantToken,
          endpoints.masterData
        );
        const masterDataEndpoint = await merchantAuthService.getExternalEndpoint(
          privateKey,
          'MasterData'
        );
        if ((masterDataEndpoint.data as any).config_type !== 'MasterData') {
          throw new Error('MasterData external endpoint config_type mismatch');
        }

        await merchantAuthService.addExternalEndpoint(merchantId, merchantToken, endpoints.mci);
        const mciEndpoint = await merchantAuthService.getExternalEndpoint(privateKey, 'MCI');
        if ((mciEndpoint.data as any).config_type !== 'MCI') {
          throw new Error('MCI external endpoint config_type mismatch');
        }

        // 3. Dynamic webhooks
        const webhooks = VtexMiddlewareConfig.webhooks(envConfig.URL_MIDDLEWARE, privateKey);
        await checkoutConfigurationService.createWebhook(
          merchantId,
          merchantToken,
          webhooks.updateMarketingData
        );
        await checkoutConfigurationService.createWebhook(
          merchantId,
          merchantToken,
          webhooks.updatePaymentData
        );
        await checkoutConfigurationService.createWebhook(
          merchantId,
          merchantToken,
          webhooks.syncOrderNotification
        );

        const webhooksResponse = await checkoutConfigurationService.getWebhooks(
          merchantId,
          merchantToken
        );
        const webhooksData = (webhooksResponse.data as any).data as any[];
        const expectedEventNames = [
          'update_marketing_data',
          'update_payment_data',
          'sync_order_notification',
        ];
        const actualEventNames = webhooksData.map((item: any) => item.event_name);
        for (const eventName of expectedEventNames) {
          if (!actualEventNames.includes(eventName)) {
            throw new Error(`Expected webhook '${eventName}' not found`);
          }
        }

        // 4. Checkout configuration
        await checkoutConfigurationService.createConfigCheckoutV2({
          merchant_id: merchantId,
          merchant_token: merchantToken,
          config_checkout_v2_data: VtexMiddlewareConfig.checkoutConfiguration() as any,
        });

        // 5. Middleware credentials
        await vtexMiddlewareService.saveCredentials(merchantId, privateKey, publicKey);

        // 6. Create payment — returns the order token for the next steps
        orderToken = await vtexMiddlewareService.createPayment(publicKey);
        if (!orderToken) {
          throw new Error('[ERROR] ----> Order token is empty');
        }
        console.log('[INFO] ----> order_token: ', orderToken);
      });

      await test.step('Should perform a successful purchase with the payment widget', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget', true);
        await testingTool.setUpExplore({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        await testingTool.navigateToSelectOrderType();

        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        await paymentDeunaNowPage.clickSkipOTP();
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.stripeVisaSuccessful, {
          country: 'CO',
        });
        await paymentDeunaNowPage.clickPay();
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(expectedStatus, 200);
      });

      await test.step('Get order should retrieve the corresponding order_id and transaction_id', async () => {
        const orderResponse = await emaService.getOrder(privateKey, orderToken);
        const { order } = orderResponse.data;

        if (!order.order_id || !order.transaction_id) {
          throw new Error(
            '[ERROR] ----> order_id or transaction_id is missing from get_order response'
          );
        }

        orderId = order.order_id;
        transactionId = order.transaction_id;
        console.log('[INFO] ----> order_id: ', orderId);
        console.log('[INFO] ----> transaction_id: ', transactionId);
      });

      await test.step('Order should exists in the orders list and must be processed', async () => {
        const adminLoginPage = new AdminLoginPage(page);
        await adminLoginPage.gotoAdmin();

        const adminHomePage = new AdminHomePage(page);
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
        await adminHomePage.goToOrders();

        const adminOrdersPage = new AdminOrdersPage(page);
        await adminOrdersPage.assertPresenceInOrdersView();
        await adminOrdersPage.searchOrderByIdCaseSensitive(orderId);
        await adminOrdersPage.assertOrderFound(orderId);
        const foundOrderToken = await adminOrdersPage.getTokenFromOrderFound(orderId);

        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, foundOrderToken);
        await adminOrderDetailsPage.assertPaymentStatus(expectedStatus);
      });

      await test.step('Trace logs should contain the vtex event names', async () => {
        const tvResult = await transactionTraceService.getTransactionVisibilityLogs(
          transactionId,
          'transaction_visibility',
          merchantId,
          merchantToken
        );

        const eventNames = [
          'tv_vtex_mw_create_payment',
          'tv_vtex_mw_place_order',
          'tv_vtex_place_order',
          'tv_vtex_send_payment_info',
          'tv_vtex_process_order',
        ];

        const traceLogs = tvResult.data as TraceLog[];
        const traceLogsEventNames = traceLogs
          .map((log: TraceLog) => log?.metadata?.transaction_visibility?.event_name)
          .filter(Boolean);
        const allEventNamesPresent = eventNames.every((eventName) =>
          traceLogsEventNames.includes(eventName)
        );

        if (!allEventNamesPresent) {
          throw new Error(
            `[ERROR] ----> Not all assured event names are present in the trace logs. Expected: ${eventNames.join(', ')}, Found: ${traceLogsEventNames.join(', ')}`
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
    };
  };
}
