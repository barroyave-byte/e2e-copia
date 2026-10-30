import { expect, test } from '@support/fixtures';

import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { BasicMerchantResult } from '@support/http/services/MerchantAuthService';

test.describe('@regression Cybersource Authorize BR', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig: BasicMerchantResult = await merchantPool.acquire(
      'CYBERSOURCE_PROCESSOR_AUTHORIZE_CHECKOUT_CONFIG_VAULT_NETWORK_BR'
    );
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
    publicKey = merchantConfig.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('BR', merchantConfig.privateKey);
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
    '@PI-T1097 Authorize exitoso Visa con Cybersource usando el vault en Brasil',
    {
      tag: [
        '@payments_integration',
        '@vault',
        '@preprod',
        '@authorization',
        '@team_payment_integration',
      ],
    },
    async ({ page }) => {
      const vaultWidgetPage = new VaultWidgetPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');

      await test.step('fill out the credit card form and click save', async () => {
        await vaultWidgetPage.fillFormVault(creditCardData.cybersourceVisaCardSuccessful, {
          country: 'BR',
        });
        await vaultWidgetPage.clickOnPay();
      });

      await test.step('It is validated that the card and purchase V2 request is sent', async () => {
        const cardId = await vaultWidgetPage.assertCardRequest();
        const status = 'authorized';
        await vaultWidgetPage.assertOrderStatusRequestPurchaseV2(status, 200, cardId);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
