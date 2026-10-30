import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';

const configMerchant = new ConfigMerchant();

test.describe(
  '@regression Flujo de compras con tarjetas con UATP en Explore',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async () => {
      const merchant = await configMerchant.basicSetup('EC');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await apiCallNewman.configureWidget(merchantId, merchantToken);

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripeProcessor,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'User opens the testing page and accesses the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.setUpExplore({
          orderToken: '',
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        const ecommercePage = new EcommercePage(page);
        await ecommercePage.clickOnProductUATP();
        await ecommercePage.addToCart();
        await ecommercePage.clickOnIconBasket();
        await testingTool.navigateToSelectOrderType();
      }
    );

    test(
      '@ENTP1-T2275 Flujo de compras con tarjetas con UATP en Explore',
      { tag: ['@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('Fill out the credit card form and then fill out the UATP card and assert that the cvv is not required', async () => {
          await paymentDeunaNowPage.fillCardForm(creditCardData.mercadopagoMasterCardSuccessful, {
            avoidInstallmentsCall: true,
            country: 'EC',
          });
          await paymentDeunaNowPage.fillCardForm(creditCardData.uatpSuccess, {
            avoidInstallmentsCall: true,
            country: 'EC',
          });

          await paymentDeunaNowPage.assertNotRequiredCvv();
        });
      }
    );
  }
);
