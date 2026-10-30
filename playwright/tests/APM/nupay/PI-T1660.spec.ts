import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { NupayFormPage } from '@pages/explore/forms/nupayFormPage';

const configMerchant = new ConfigMerchant();

test.describe('@regression NuPay', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeNupayOrder(privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.nupayProcessor,
      merchantId,
      merchantToken
    );
  });

  test.fixme(
    '@PI-T1660 Solicitud de consentimiento para un pedido sin CPF',
    {
      tag: ['@payments_integration', '@team_payment_integration'],
      annotation: { type: 'bug', description: 'PI-3709' },
    },
    async ({ page }) => {
      const nupayFormPage = new NupayFormPage(page);

      await test.step('The user open the widget and navigate to forms page', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });
      await test.step('The user selects the nupay form and fill the form without CPF number', async () => {
        await nupayFormPage.fillDocumentAndClickOnAssignConsent('');
      });
      await test.step('The error in /consent is validated indicating that CPF is required', async () => {
        await nupayFormPage.validateErrorWithoutCPF();
      });
    }
  );
});
