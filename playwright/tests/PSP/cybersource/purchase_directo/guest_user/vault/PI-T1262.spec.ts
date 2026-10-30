import { expect, test } from '@support/fixtures';

import * as creditCardData from '@support/interfaces/credit_cards';

import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { BasicMerchantResult } from '@support/http/services/MerchantAuthService';

test.describe('@regression Cybersource Purchase PE', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig: BasicMerchantResult = await merchantPool.acquire(
      'CYBERSOURCE_PROCESSOR_CHECKOUT_CONFIG_VAULT_NETWORK_PE'
    );
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    const merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    publicKey = merchantConfig.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('PE', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
      await testingTool.navigateAndSetup({
        merchantCredentials: { publicKey, privateKey },
        orderToken,
      });
    }
  );

  test(
    '@PI-T1262 Purchase denegado Visa con Cybersource usando vault en Peru',
    {
      tag: [
        '@preprod',
        '@purchase',
        '@payments_integration',
        '@vault',
        '@team_payment_integration',
      ],
    },
    async ({ page }) => {
      const vaultWidgetPage = new VaultWidgetPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('fill out the credit card form and click save', async () => {
        await vaultWidgetPage.fillFormVault(creditCardData.cybersourceVisaFailed, {
          country: 'PE',
        });
        await vaultWidgetPage.clickOnPay();
      });

      await test.step('It is validated that the card and purchase V2 request is sent', async () => {
        const cardId = await vaultWidgetPage.assertCardRequest();
        const status = 'denied';
        await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('denied', 422, cardId);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
