import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test } from '@support/fixtures';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { BasicMerchantResult } from '@support/http/services/MerchantAuthService';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { retryGetOrderStatus } from '@support/utils/retries';

test.describe('@regression Stripe Purchase', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig: BasicMerchantResult = await merchantPool.acquire(
      'STRIPE_PROCESSOR_CHECKOUT_CONFIG_VAULT_NETWORK_MX'
    );
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    const merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    publicKey = merchantConfig.publicKey;

    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
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

  const email = EmailGenerator.generatePayerEmail();

  test(
    '@PI-T1093 Purchase Fallido con visa usando vault - Stripe Direct',
    {
      tag: [
        '@preprod',
        '@purchase',
        '@vault',
        '@payments_integration',
        '@flaky',
        '@team_payment_integration',
      ],
    },
    async ({ page, emaService }) => {
      const vaultWidgetPage = new VaultWidgetPage(page);

      await test.step('fill out the credit card form and click save', async () => {
        await vaultWidgetPage.fillFormVault(creditCardData.stripeVisaFailed, {
          country: 'MX',
        });
        await vaultWidgetPage.clickOnPay();
      });

      await test.step('It is validated that the card and purchase V2 request is sent', async () => {
        const cardId = await vaultWidgetPage.assertCardRequest();
        await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('denied', 422, cardId);
        await page.waitForTimeout(1000);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'denied');
      });
    }
  );
});
