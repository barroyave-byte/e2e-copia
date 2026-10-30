import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { BasicMerchantResult } from '@support/http/services/MerchantAuthService';

const configMerchantVault = new ConfigMerchant();

test.describe('@regression Worldpay Authorize with Guatemala Quetzales', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let merchantToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchantVault.basicSetup('GT');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    merchantToken = merchant.merchantToken;

    await apiCallNewman.createCheckoutConfigVault(merchantId, merchantToken);
    const tokenized = await emaService.tokenizeDeunaNowOrder('GT', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createNetwork(merchantId, merchantToken);
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.worldpayProcessorAuthorize_GT,
      merchantId,
      merchantToken
    );
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
    '@PI-T1163 Authorize exitoso Visa con WorldPay usando vault en Guatemala',
    { tag: ['@payments_integration', '@smoke', '@fixme_preprod', '@team_payment_integration'] },
    async ({ page }) => {
      const vaultWidgetPage = new VaultWidgetPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('fill out the credit card form and click save', async () => {
        await vaultWidgetPage.fillFormVault(creditCardData.worldpayVisaCardSuccessful, {
          country: 'GT',
        });
        await vaultWidgetPage.clickOnPay();
      });

      await test.step('It is validated that the card and purchase V2 request is sent', async () => {
        const cardId = await vaultWidgetPage.assertCardRequest();
        await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('authorizing', 200, cardId);
        const status = 'authorizing';
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
