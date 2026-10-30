import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { NupayFormPage } from '@pages/explore/forms/nupayFormPage';

const configMerchant = new ConfigMerchant();
let orderToken: string;
let orderId: string;
let merchantId: string;
let merchantToken: string;
let merchantName: string;
let privateKey: string;
let publicKey: string;

test.describe('@regression NuPay', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const response = await emaService.tokenizeNupayOrder(privateKey, { cpf: '55784343637' });
    orderToken = response.data.token;
    orderId = response.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.nupayProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T1663 Enviar el concentimiento de una orden con un CPF válido sin cuenta en NUPAY',
    { tag: ['@payments_integration', '@team_payment_integration'] },
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
        await nupayFormPage.fillDocumentAndClickOnAssignConsent('55784343637');
      });

      await test.step('The error in /consent is validated indicating that CPF is required', async () => {
        await nupayFormPage.validateConsentCPFWitoutNupayAccount(orderToken, orderId);
      });
    }
  );
});
