import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';

import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';

const globalAssert = new GlobalAssert();
const configMerchant = new ConfigMerchant();

test.describe(
  '@regression Validate payment functionality from checkout',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('EC');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createConfigurationV2(
        {
          widgetGeneralsConfig: {
            ...widgetsGeneralConfig,
            user_experience: {
              show_saved_cards_flow: true,
            },
          },
        },
        merchantId,
        merchantToken
      );
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.paymentezProcessor,
        merchantId,
        merchantToken
      );

      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBody({
          country: 'EC',
          checkout_modules: [],
        })
      );
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2075 Payment Link: Verificar que, al no marcar el checkbox de guardado de tarjeta, las tarjetas no se guardan.',
      {
        tag: ['@preprod', '@checkout_ui', '@team_enterprise'],
      },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup', { timeout: 10000 });
        const paymentPage = new PaymentPage(paymentLinkPage);

        await test.step('The user fills existing credit card information cvv', async () => {
          await paymentPage.fillCreditCardDataWithBase(creditCardData.clickToPayMastercardSuccess);
        });
        await test.step('The user see save card checkbox', async () => {
          await paymentPage.assertUserSeeSaveCardCheckbox();
        });

        await test.step('The user unchecks in save card checkbox', async () => {
          await paymentPage.clickSaveCardCheckbox();
        });
        await test.step('The user clicks on pay button', async () => {
          await paymentPage.clickOnPay(paymentLinkPage);
          await paymentPage.assertOrderStatusRequestPurchase('processed', 200, {
            disableBodyVerification: true,
          });
        });
        await test.step('order is processed successfully', async () => {
          await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
          await paymentPage.assertCardsCreationIsCalled(false);
        });
      }
    );
  }
);
