import { test } from '@support/fixtures';
import { aplazoProcessor } from '@support/interfaces/payment_processors';
import { PaymentPage as CheckoutPaymentPage } from '@pages/checkout/payment/paymentPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AplazoFormPage } from '@pages/explore/forms/aplazo/aplazoFormPage';
import { AplazoRedirectPage } from '@pages/bnpl/aplazoPage';
import { CheckoutTranslations } from '@support/translations/selectors/checkout/checkoutTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';
import { randomUUID } from 'crypto';
import { customStyleHideChangeMethod } from '@support/mocks/customStyleHideChangeMethod';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

const configMerchant = new ConfigMerchant();

const checkoutTranslations: CheckoutTranslations = getTranslations('checkout', 'ES');
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  elementsConfig: {
    theme_config: [
      {
        id: randomUUID(),
        name: 'theme_config',
        config: JSON.stringify(customStyleHideChangeMethod),
      },
    ],
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

test.describe(
  '@regression Aplazo Form Purchase - CO',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    test.beforeAll(async ({ emaService }) => {
      // 1. Create basic merchant (does NOT configure widget - uses createBasicMerchant)
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      // 2. Configure widget with custom theme FIRST (before it gets auto-created)
      await apiCallNewman.configureWidget(merchantId, merchantToken, generalWidgetConfig);

      // 3. Create payment processor
      await apiCallNewman.createPaymentProcessor(aplazoProcessor, merchantId, merchantToken);

      // 4. Tokenize order with custom body matching Postman structure
      const orderBody = DeunacheckoutOrderBuilder.createBody('CO', { amount: 34200 });
      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody)).data.token;
    });

    test(
      '@ENTP1-T2471 Payment Form - Aplazo: Verify hideChangeMethodButton config hides change method button',
      { tag: ['@smoke_gmv', '@smoke', '@team_enterprise', '@preprod'] },
      async ({ page }) => {
        const paymentPage = new AplazoFormPage(page);
        const checkoutPaymentPage = new CheckoutPaymentPage(page);
        let aplazoRedirectPage: AplazoRedirectPage;

        await test.step('Should opens the testing page and the required form', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should selects Aplazo as a Payment Method', async () => {
          await paymentPage.selectAplazoForm();
        });

        await test.step('Should click on the Pay button to open the redirect widget', async () => {
          const aplazoRedirectPagePromise = page.waitForEvent('popup');
          await paymentPage.clickPay();
          const popup = await aplazoRedirectPagePromise;
          aplazoRedirectPage = new AplazoRedirectPage(popup);
        });

        await test.step('Should verify that "Cambiar método de pago" text is not visible in the original page', async () => {
          await checkoutPaymentPage.assertChangeMethodButtonIsHidden();
        });

        await test.step('Should close Aplazo window to cancel purchase', async () => {
          await aplazoRedirectPage.closePage();
          await checkoutPaymentPage.assertAlertNotification(
            checkoutTranslations.apmRedirectView.windowClosedWithoutAction
          );
        });
      }
    );
  }
);
