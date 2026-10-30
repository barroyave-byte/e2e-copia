import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';

test.describe(
  '@regression PayPal ACDC - Payment Vault (Modal)',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const configMerchant = new ConfigMerchant();

      const merchantConfig = await configMerchant.basicSetup('MX');
      merchantId = merchantConfig.merchantId;
      merchantToken = merchantConfig.merchantToken;
      merchantName = merchantConfig.merchantName;
      privateKey = merchantConfig.privateKey;
      publicKey = merchantConfig.publicKey;
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken);
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.paypalACDCProcessor,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', merchantConfig.privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test(
      '@ENTP1-T2414 Verify PayPal FraudNet requests',
      { tag: ['@preprod', '@checkout_ui', '@team_payment_integration'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Should opens the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should verify that the PayPal FraudNet requests are sent', async () => {
          await vaultWidgetPage.assertPaypalFraudnetRequests();
        });
      }
    );
  }
);
