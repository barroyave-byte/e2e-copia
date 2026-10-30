import { test, expect } from '@support/fixtures';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

let purchaseResponse: any;

test.describe('@regression Purchase with vault widget using Dlocal', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;
  let merchantToken: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire(
      'DLOCAL_PROCESSOR_CHECKOUT_CONFIG_VAULT_NETWORK_PE'
    );
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    merchantToken = merchant.merchantToken;

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
    '@PAYM-T2196 Purchase v2 exitoso enviando solo 1 ip en browser details',
    { tag: ['@payments_integration', '@team_payment_integration', '@preprod', '@purchase'] },
    async ({ page }) => {
      const vaultWidgetPage = new VaultWidgetPage(page, 'ES');

      await test.step('User fills credit card data in vault widget', async () => {
        await vaultWidgetPage.fillFormVault(creditCardData.dlocalVisaCardSuccessful, {
          avoidInstallmentsCall: true,
          country: 'PE',
        });
        await vaultWidgetPage.assertButtonEnabled();
      });

      await test.step('User clicks on pay button', async () => {
        await vaultWidgetPage.clickOnPay();
      });

      await test.step('Validate order status and capture browser details', async () => {
        purchaseResponse = await vaultWidgetPage.assertOrderStatusRequestPurchaseV2(
          'processed',
          200
        );
      });

      await test.step('Validate the ip address contain 1 value in purchase response', async () => {
        const ipAddresses = purchaseResponse.order.browser_details.ip_address
          .split(',')
          .map((ip) => ip.trim());
        console.info('IP Addresses:', ipAddresses);
        expect(ipAddresses.length, 'Should only have one IP address').toBe(1);
      });
    }
  );
});
