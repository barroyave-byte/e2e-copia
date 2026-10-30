import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { legacyThemeConfig } from '@support/mocks/legacyThemeConfig';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchantVault = new ConfigMerchant();

test.describe('@regression Pays with CVV for PE', () => {
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
    await apiCallNewman.configureVaultWidget(merchantId, merchantToken, {
      customThemeConfig: legacyThemeConfig,
    });
    const tokenized = await emaService.tokenizeDeunaNowOrder('PE', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.dlocalProcessorPE,
      merchantId,
      merchantToken
    );
  });

  test.beforeEach(
    'User opens the testing page and accesses the required widget',
    async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test(
    '@PI-T1637 Realizar compra con tarjeta crédito y envío de CVV en las transacciones correcto - TiendaMia PE',
    { tag: ['@payments_integration', '@test_base', '@team_payment_integration'] },
    async ({ page }) => {
      const vaultWidgetPage = new VaultWidgetPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('Validate user sees terms and conditions and privacy policy', async () => {
        await vaultWidgetPage.assertUserSeeTermsAndConditions();
      });

      await test.step('Fill out the credit card form and save', async () => {
        await vaultWidgetPage.fillFormVault(creditCardData.dlocalVisaInstallmentCardPE, {
          avoidInstallmentsCall: true,
          country: 'PE',
        });
        await vaultWidgetPage.assertButtonEnabled();
      });

      await test.step('User selects Pay', async () => {
        await vaultWidgetPage.clickOnPay();
      });

      await test.step('Validate card and purchase V2 processed', async () => {
        const cardId = await vaultWidgetPage.assertCardRequest();
        await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('processed', 200, cardId);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed');
      });

      await test.step('Validate status must be displayed in the history section of the order', async () => {
        await adminOrderDetailsPage.assertPaymentHistoryStatus('processed');
      });
    }
  );
});
