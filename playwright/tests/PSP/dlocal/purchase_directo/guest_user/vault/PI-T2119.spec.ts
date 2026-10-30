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

test.describe('@regression DLocal Captured Transactions for UY', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchantVault.basicSetup('UY');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('UY', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.configureVaultWidget(merchantId, merchantToken, {
      customThemeConfig: legacyThemeConfig,
    });

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.dlocalProcessorPayconnectUYAuthorize,
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
    '@PI-T2119 DLocal Captured Transaction - TiendaMia UY',
    {
      tag: ['@payments_integration', '@smoke_gmv', '@team_payment_integration'],
    },
    async ({ page }) => {
      const vaultWidgetPage = new VaultWidgetPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('Validate user sees terms and conditions and privacy policy', async () => {
        await vaultWidgetPage.assertUserSeeTermsAndConditions();
      });

      await test.step('Fill out the Visa credit card form for captured transaction', async () => {
        await vaultWidgetPage.fillFormVault(creditCardData.dlocalVisaCardSuccessful, {
          avoidInstallmentsCall: true,
          country: 'UY',
        });
        await vaultWidgetPage.assertButtonEnabled();
      });

      await test.step('User initiates payment for capture flow', async () => {
        await vaultWidgetPage.clickOnPay();
      });

      await test.step('Validate card creation and authorize transaction', async () => {
        const cardId = await vaultWidgetPage.assertCardRequest();
        await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('authorized', 200, cardId);
      });

      await test.step('Capture the authorized transaction', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('authorized');
        await adminOrderDetailsPage.reloadOrderDetails();
        await adminOrderDetailsPage.captureTotalOrder();
        await adminOrderDetailsPage.assertPaymentStatus('captured');
      });

      await test.step('Validate captured status in payment history', async () => {
        await adminOrderDetailsPage.assertPaymentHistoryStatus('captured');
        await adminOrderDetailsPage.assertPaymentStatusTransition('authorized', 'captured');
      });

      await test.step('Validate processor and payment method details', async () => {
        await adminOrderDetailsPage.assertProcessorName('dlocal');
        await adminOrderDetailsPage.assertPaymentMethod('credit_card');
      });
    }
  );
});
