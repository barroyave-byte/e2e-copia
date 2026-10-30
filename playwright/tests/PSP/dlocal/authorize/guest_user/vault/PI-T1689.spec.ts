import { test } from '@support/fixtures';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import envConfig from '@support/envConfig';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const baseUrl = envConfig.BASE_URL_POSTMAN;

test.describe('@regression Worldpay Authorize with Peruvian Pesos', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire(
      'DLOCAL_PROCESSOR_CHECKOUT_CONFIG_VAULT_NETWORK_PE'
    );
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('PE', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test(
    '@PI-T1689 Procesar transacciones de autorización y captura enviando el CVV correctamente',
    {
      tag: [
        '@review_action',
        '@payments_integration',
        '@team_payment_integration',
        '@preprod',
        '@capture',
      ],
    },
    async ({ page }) => {
      const vaultWidgetPage = new VaultWidgetPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('fill out the credit card form and click save', async () => {
        await vaultWidgetPage.fillFormVault(creditCardData.worldpayVisaCardSuccessful, {
          country: 'PE',
        });
        await vaultWidgetPage.clickOnPay();
      });

      await test.step('It is validated that the card and purchase V2 request is sent', async () => {
        const cardId = await vaultWidgetPage.assertCardRequest();
        const status = 'processed';
        await vaultWidgetPage.assertOrderStatusRequestPurchaseV2(status, 200, cardId);
      });

      await test.step('It is validated that the order is created in the admin', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed');
      });
    }
  );
});
