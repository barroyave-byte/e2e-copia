import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { setElementsConfig } from '@tests/teams/checkout/payment_link/checkout_modules/common';
import { waitForConsoleError } from '@support/utils/consoleErrorListener';

const configMerchantVault = new ConfigMerchant();

test.describe(
  '@regression Compra Exitosa de Usuario Nuevo con Tarjeta Nueva usando el Vault Widget',
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
      const merchant = await configMerchantVault.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await setElementsConfig(true, true, merchantId, merchantToken);

      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripeProcessor,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'User opens the testing page and accesses the required widget',
      async ({ page }) => {
        // Open the testing page and navigate to the widget to be tested
        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2105 Elements: vault display error when both auth flows are enabled',
      { tag: ['@smoke', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Console error displays correct message', async () => {
          const errorText = 'invalid_merchant_configuration';

          const errorLogged = await waitForConsoleError(errorText, page);
          expect(errorLogged).toBeTruthy();
        });

        await test.step('Validate user sees terms and conditions and privacy policy', async () => {
          await vaultWidgetPage.genericErrorPageIsShown();
        });
      }
    );
  }
);
