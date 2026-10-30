import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { OxxopayFormPage } from '@pages/explore/forms/oxxo/oxxopayFormPage';
import { ReferencePayModalPage } from '@pages/explore/forms/oxxo/referecePayModalPage';
import * as apiCallNewman from '@support/newman/apiCallNewman';

const configMerchant = new ConfigMerchant();
const amountToBePaid = 30000;

const payuOxxoCashProcessorError = {
  name: 'PAYU_OXXO_CASH',
  payment_processor_id: 96,
  enabled: true,
  currency_iso3: 'MXN',
  external_merchant_id: '510006',
  private_api_key: 'bjyFxu382vh5d5GjxxTu409wD3',
  public_api_key: 'jI4ZhgfpWpNiM17',
  automatic_capture: true,
  country_iso: 'MX',
  flow_version: 'workflow',
  extra_params: {
    account_id: '510006',
  },
  flow: 'payconnect',
};

test.describe('@regression Pays with Oxxo Pay MX', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
      amount: amountToBePaid,
    });
    await apiCallNewman.createPaymentProcessor(
      payuOxxoCashProcessorError,
      merchantId,
      merchantToken
    );
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PI-T1728 Pago erroneo con OXXO Pay',
    {
      tag: [
        '@admin_connection',
        '@admin-preprod',
        '@team_admin',
        '@team_payment_integration',
        '@team_enterprise',
        '@preprod',
        '@purchase',
      ],
    },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const oxxopayFormPage = new OxxopayFormPage(page);
      const referencePayModalPage = new ReferencePayModalPage(page, 'ES');

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user open the widget and navigate to forms page', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('The user select OXXO option', async () => {
        await oxxopayFormPage.selectOxxoForm();
      });

      await test.step('The user clicks on pay', async () => {
        await oxxopayFormPage.clickPay();
      });

      await test.step('The user validates that an error screen is displayed', async () => {
        await referencePayModalPage.assertErrorScreen();
      });

      await test.step('The user validates that the error id is displayed', async () => {
        await referencePayModalPage.assertErrorIdDisplayed();
      });

      await test.step('The user validates that the "Volver" button is displayed', async () => {
        await referencePayModalPage.assertBackButtonDisplayed();
      });

      await test.step('The user validates that the "Volver" button works to close the modal', async () => {
        await referencePayModalPage.assertBackButtonWorks();
      });
    }
  );
});
