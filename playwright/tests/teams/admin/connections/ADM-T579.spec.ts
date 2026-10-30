import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { mpWalletPaymentMethods } from '@pages/admin/connections/processors';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as processorsConfig from '@support/interfaces/payment_processors';

const configMerchant = new ConfigMerchant();

test.describe('@regression feature to validate Connection operation completes successfully', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
  });
  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user configure MercadoPago Wallet connection', async () => {
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.mercadopagoWallet,
          processorsConfig.buildMPWalletProcessor({
            binary_mode: true,
            exclude_payment_methods: [
              mpWalletPaymentMethods.atm,
              mpWalletPaymentMethods.digitalCurrency,
            ],
          })
        );
      });
    }
  );

  test(
    '@ADM-T579 Connection Mercado Pago Checkout Pro',
    {
      tag: [
        '@admin',
        '@smoke',
        '@admin_connection',
        '@preprod',
        '@admin_ui',
        '@admin-preprod',
        '@team_admin',
        '@admin_smoke',
      ],
    },
    async ({ page }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminConnectionsPage = new AdminConnectionsPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
      });

      await test.step('The user goes to connections', async () => {
        await adminHomePage.goToConnections();
      });

      await test.step('The user goes to actives providers', async () => {
        await adminConnectionsPage.clickOnListActiveProcessors();
      });

      await test.step('The user click on Edit Connection', async () => {
        await adminConnectionsPage.clickOnWalletFirstOptions();
        await adminConnectionsPage.clickOnEditProcessor();
      });

      await test.step('The user update Mercado Pago Checkout Pro info', async () => {
        await adminConnectionsPage.configureMercadoPagoWallet(
          processorsConfig.mercadoPagoWalletProcessorNewInfo
        );
        await adminConnectionsPage.waitForEditProcessorResponse();
        await adminConnectionsPage.assertConnectionConfigured();
      });

      await test.step('The user check Mercado Pago Checkout Pro info', async () => {
        await adminConnectionsPage.clickOnWalletFirstOptions();
        await adminConnectionsPage.clickOnEditProcessor();
        await adminConnectionsPage.assertMercadoPagoWalletInfoSaved(
          processorsConfig.mercadoPagoWalletProcessorNewInfo
        );
      });
    }
  );
});
