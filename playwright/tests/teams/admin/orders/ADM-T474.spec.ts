import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

const configMerchant = new ConfigMerchant();

test.describe('@regression Routing Payment Dropdown Visibility', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('PE');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.cybersourceProcessorAuthorize_PE,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T474 Verificar visibilidad del dropdown de PSPs cuando se selecciona "Declinar"',
    {
      tag: [
        '@routing',
        '@admin',
        '@smoke',
        '@preprod',
        '@admin_ui',
        '@admin-preprod',
        '@team_admin',
      ],
    },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page);

      await test.step('Admin user logs into the admin page and sets the merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('Admin user clicks on Payment strategy', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      await test.step('Admin user clicks edit icon under "Regla default Activa"', async () => {
        await adminPaymentStrategyPage.clickEditDefaultProcessing();
      });

      await test.step('Admin user sets Mercado pago order rule', async () => {
        await adminPaymentStrategyPage.selectDefaultPaymentEngine(ConnectionsAvailable.mercadopago);
      });

      await test.step('Admin user goes to last routing and selects "Declinar/procesador de pago" dropdown and clicks on "Procesador de pago"', async () => {
        await adminPaymentStrategyPage.addLastPaymentProcessor();
      });

      await test.step('Admin user verifies "Seleccione un procesador" dropdown shows', async () => {
        await adminPaymentStrategyPage.verifySelectProcessorVisibility(true);
      });

      await test.step('Admin user goes to last routing and selects "Declinar/procesador de pago" dropdown and clicks on "Declinar"', async () => {
        await adminPaymentStrategyPage.selectLastPaymentProcessor();
      });

      await test.step('Admin user verifies "Seleccione un procesador" dropdown does not show anymore', async () => {
        await adminPaymentStrategyPage.verifySelectProcessorVisibility(false);
      });
    }
  );
});
