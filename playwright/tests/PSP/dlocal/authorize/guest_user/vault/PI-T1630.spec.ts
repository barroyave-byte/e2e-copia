import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';

import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchantVault = new ConfigMerchant();

test.describe('@regression Realizar compra con usuario invitado PSP Dlocal con tarjeta de credito', () => {
  let merchantId: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;

  test.beforeAll(async ({ emaService }) => {
    const merchantSetup = await configMerchantVault.basicSetup('EC');
    const { merchantId: merchantIdParam, merchantToken } = merchantSetup;
    privateKey = merchantSetup.privateKey;
    publicKey = merchantSetup.publicKey;
    merchantId = merchantIdParam;
    await apiCallNewman.createCheckoutConfigVault(merchantId, merchantToken);
    const tokenized = await emaService.tokenizeDeunaCheckoutOrder('EC', privateKey);
    orderToken = tokenized.data.token;
    await apiCallNewman.createNetwork(merchantId, merchantToken);
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.dlocalProcessorEC,
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

  test.fixme(
    '@PI-T1630 Realizar compra con usuario invitado PSP Dlocal con tarjeta de credito',
    {
      annotation: { type: 'bug', description: 'PI-4990' },
      tag: ['@review_action', '@payments_integration', '@flaky', '@team_payment_integration'],
    },
    async ({ page }) => {
      const vaultWidgetPage = new VaultWidgetPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('Rellenar el formulario de tarjeta de crédito y preparar para pagar', async () => {
        await vaultWidgetPage.fillFormVault(creditCardData.dlocalVisaInstallmentCard, {
          country: 'EC',
        });
        await vaultWidgetPage.clickOnPay();
      });

      await test.step('Validar que la tarjeta y la solicitud de compra V2 se envían', async () => {
        const cardId = await vaultWidgetPage.assertCardRequest();
        const status = 'processed';
        await vaultWidgetPage.assertOrderStatusRequestPurchaseV2(status, 200, cardId);
      });

      await test.step('Validar que la orden se crea en el admin', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed');
        await adminOrderDetailsPage.assertPaymentMethod('credit_card');
      });
    }
  );
});
