import { test } from '@support/fixtures';
import { invalidAplazoProcessor } from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AplazoFormPage } from '@pages/explore/forms/aplazo/aplazoFormPage';
import { AplazoReferencePayModalPage } from '@pages/explore/forms/aplazo/aplazoReferencePayModalPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

test.describe(
  '@regression Aplazo Form Purchase - MX',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    test.beforeAll(async ({ emaService }) => {
      const configMerchantCheckout = new ConfigMerchantCheckout();
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(invalidAplazoProcessor, merchantId, merchantToken);

      const orderBody = DeunacheckoutOrderBuilder.createBody('MX', { amount: 100 });
      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody)).data.token;
    });

    test(
      '@ENTP1-T2048 Payment Form - Aplazo: Purchase Error (Aplazo Window)',
      { tag: ['@preprod', '@checkout_ui', '@smoke', '@team_enterprise'] },
      async ({ page }) => {
        const aplazoPage = new AplazoFormPage(page);
        const aplazoReferencePayModalPage = new AplazoReferencePayModalPage(page);

        await test.step('Should opens the testing page and the required form', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should selects Aplazo as a Payement Method', async () => {
          await aplazoPage.selectAplazoForm();
        });

        await test.step('The user clicks on pay', async () => {
          await aplazoPage.clickPay();
        });

        await test.step('The user validates that an error screen is displayed', async () => {
          await aplazoReferencePayModalPage.assertFormErrorScreen();
        });

        await test.step('The user validates that the "Volver" button works to close the modal', async () => {
          await aplazoReferencePayModalPage.assertBackButtonWorks();
        });
      }
    );
  }
);
