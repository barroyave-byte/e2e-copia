import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { BasicMerchantResult } from '@support/http/services/MerchantAuthService';
const configMerchantVault = new ConfigMerchant();

test.describe('@regression Cybersource Purchase PE', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchantConfig: BasicMerchantResult = await configMerchantVault.basicSetup('PE');
    merchantName = merchantConfig.merchantName;

    merchantId = merchantConfig.merchantId;
    const merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    publicKey = merchantConfig.publicKey;

    await apiCallNewman.createCheckoutConfigVault(merchantId, merchantToken);
    await apiCallNewman.createNetwork(merchantId, merchantToken);
    const tokenized = await emaService.tokenizeDeunaNowOrder('PE', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.cybersourceProcessor_PE,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PAYM-T2190 Purchase using a card tokenized (payment vault) american express - Cybersource - Peru',
    {
      tag: [
        '@payments_integration',
        '@vault',
        '@admin_connection',
        '@fixme_preprod',
        '@purchase',
        '@admin-preprod',
        '@team_payment_integration',
      ],
    },
    async ({ page }) => {
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The user opens the testing page and opens the required widget', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          merchantCredentials: { publicKey, privateKey },
          orderToken,
        });
      });

      const vaultWidgetPage = new VaultWidgetPage(page);
      await test.step('fill out the credit card form and click save', async () => {
        await vaultWidgetPage.fillFormVault(creditCardData.cybersourceAmexSuccessful, {
          country: 'PE',
        });
        await vaultWidgetPage.clickOnPay();
      });

      await test.step('It is validated that the card and purchase V2 request is sent', async () => {
        const cardId = await vaultWidgetPage.assertCardRequest();
        await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('processing', 200, cardId);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processing');
      });
    }
  );
});
