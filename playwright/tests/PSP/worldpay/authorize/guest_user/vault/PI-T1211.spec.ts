import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';

import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import envConfig from '@support/envConfig';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const globalAssert = new GlobalAssert();
const baseUrl = envConfig.BASE_URL_POSTMAN;
const configMerchantVault = new ConfigMerchant();

test.describe('@regression Worldpay Authorize with Peruvian Pesos', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchantVault.basicSetup('PE');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    await apiCallNewman.createCheckoutConfigVault(merchantId, merchantToken);
    const tokenized = await emaService.tokenizeDeunaNowOrder('PE', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createNetwork(merchantId, merchantToken);
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.worldpayProcessorAuthorize_PE,
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
    '@PI-T1211 Authorize exitoso Visa con WorldPay usando vault en Peru',
    { tag: ['@payments_integration', '@smoke', '@fixme_preprod', '@team_payment_integration'] },
    async ({ page }) => {
      const vaultWidgetPage = new VaultWidgetPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('fill out the credit card form and click save', async () => {
        await vaultWidgetPage.fillFormVault(creditCardData.worldpayVisaCardSuccessful, {
          country: 'PE',
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
