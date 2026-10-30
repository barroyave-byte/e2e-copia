import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { FormsPage } from '@pages/explore/formsPage';
import { ClickToPayFormPage } from '@pages/explore/forms/clickToPayFormPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { avoidAntibot } from '@support/utils/avoidAntibot';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import { faker } from '@faker-js/faker';
import { getCustomThemeConfig } from '@support/mocks/newThemeConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantVault = new ConfigMerchant();
const email = EmailGenerator.generateRegisteredUserEmail();
const phone = `+57${faker.string.numeric(10)}`;
let isReopenCycle = false; // Controla si estamos en el flujo guest o auth
let privateKey = '';
let publicKey = '';
let merchantId: string;
let merchantName: string;
let orderToken: string;
let orderId: string;

test.describe(
  '@regression Click to Pay Purchase - MX',
  { tag: ['@checkout', '@elements_link', '@click_to_pay'] },
  () => {
    test.beforeAll(async ({ checkoutConfigurationService }) => {
      const merchantConfig = await configMerchantVault.basicSetup('MX');
      merchantName = merchantConfig.merchantName;
      privateKey = merchantConfig.privateKey;
      publicKey = merchantConfig.publicKey;
      merchantId = merchantConfig.merchantId;
      const merchantToken = merchantConfig.merchantToken;

      const customConfig = {
        buttons: { borderRadius: '20px' },
        inputs: { borderRadius: '50%' },
      };
      const customThemeConfig = getCustomThemeConfig(customConfig);

      await checkoutConfigurationService.configClickToPay(merchantId, merchantToken, [
        { id: 'test', name: 'default', config: JSON.stringify(customThemeConfig) },
      ]);

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripeProcessor,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'User opens the testing page and accesses the required widget',
      async ({ page, emaService }) => {
        orderToken = (
          await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
            privateKey,
            DeunaPaymentLinkOrderBuilder.createBody({
              user_email: email,
              country_code: 'CO',
              first_name: 'John',
              last_name: 'Doe',
              checkout_modules: [],
              phone,
            })
          )
        ).data.token;

        // Patch the UA Client Hints BEFORE any navigation: the explore page preloads
        // the Mastercard SRC UI kit, and src.mastercard.com 403s any request whose
        // sec-ch-ua still says "HeadlessChrome".
        await avoidAntibot(page);

        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });

        const paymentPage = new PaymentPage(page);
        const formsPage = new FormsPage(page);
        const clickToPayFormPage = new ClickToPayFormPage(page);

        await test.step('Should select Click to Pay as a Payment Method', async () => {
          await paymentPage.selectPaymentMethod('Click to Pay (Payment Widget)');
        });

        await test.step('Should open Click To Pay Form', async () => {
          await formsPage.clickOnPay();
        });

        await test.step('Fill credit card information', async () => {
          await clickToPayFormPage.fillCardInfo(creditCardData.clickToPayMastercardSuccess);
        });

        await test.step('Click continue button', async () => {
          await clickToPayFormPage.clickOnContinue();
        });

        await test.step('Mastercard User Info Fill', async () => {
          await clickToPayFormPage.fillUserInfo({ avoidWaitingPurchase: true });
        });
        isReopenCycle = true;
      }
    );

    // Test para el flujo de usuario registrado
    test(
      '@ENTP1-T2083 Payment Widget: Registered Flow with predefined email',
      { tag: ['@smoke', '@team_payment_integration'] },
      async ({ page, emaService }) => {
        console.log({ isReopenCycle });
        const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
          privateKey,
          DeunaPaymentLinkOrderBuilder.createBody({
            user_email: '',
            country_code: 'CO',
            first_name: 'John',
            last_name: 'Doe',
            checkout_modules: [],
            phone,
          })
        );
        orderToken = tokenized.data.token;
        orderId = tokenized.data.order.order_id;
        await avoidAntibot(page);

        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        const paymentPage = new PaymentPage(page);
        const formsPage = new FormsPage(page);
        const clickToPayFormPage = new ClickToPayFormPage(page);

        await test.step('Should select Click to Pay as a Payment Method', async () => {
          await paymentPage.selectPaymentMethod('Click to Pay (Payment Widget)');
        });
        await test.step('Should open Click To Pay Form', async () => {
          await formsPage.clickOnPay();
        });
        await test.step('Should see Collect Email Page Title', async () => {
          await clickToPayFormPage.assertCollectEmailHeadings();
        });
        await test.step('Fill email and continue', async () => {
          await clickToPayFormPage.fillEmail(email);
        });
        await test.step('Click continue button', async () => {
          await clickToPayFormPage.clickOnContinue();
        });
        await test.step('Sees Otp Page', async () => {
          await clickToPayFormPage.assertClickToPayAuthFormIsVisible();
        });
      }
    );
  }
);
