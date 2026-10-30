import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { FormsPage } from '@pages/explore/formsPage';
import { ClickToPayFormPage } from '@pages/explore/forms/clickToPayFormPage';
import { avoidAntibot } from '@support/utils/avoidAntibot';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import { legacyThemeConfig } from '@support/mocks/legacyThemeConfig';
import { getCustomThemeConfig } from '@support/mocks/newThemeConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantVault = new ConfigMerchant();
const language = 'EN';
const email = EmailGenerator.generateRegisteredUserEmail();
let privateKey: string;
let publicKey: string;
let orderToken: string;

test.describe(
  '@regression Click to Pay Purchase - MX',
  { tag: ['@checkout', '@elements_link', '@click_to_pay'] },
  () => {
    test.beforeAll(async ({ emaService, checkoutConfigurationService }) => {
      const {
        privateKey: privateKeyFromSetup,
        merchantId,
        merchantToken,
        publicKey: publicKeyFromSetup,
      } = await configMerchantVault.basicSetup('MX');
      privateKey = privateKeyFromSetup;
      publicKey = publicKeyFromSetup;

      const customConfig = {
        buttons: { borderRadius: '20px' },
        inputs: { borderRadius: '50%' },
      };
      const customThemeConfig = getCustomThemeConfig(customConfig);

      await checkoutConfigurationService.configClickToPay(merchantId, merchantToken, [
        { id: 'test', name: 'default', config: JSON.stringify(customThemeConfig) },
      ]);

      const tokenizeOrderResponse = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBody({
          user_email: '',
          country_code: 'MX',
          first_name: 'John',
          last_name: 'Doe',
          checkout_modules: [],
        })
      );
      orderToken = tokenizeOrderResponse.data.token;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'User opens the testing page and accesses the required widget',
      async ({ page }) => {
        await avoidAntibot(page);

        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          language,
          merchantCredentials: { publicKey, privateKey },
          orderToken,
        });
      }
    );

    test(
      '@ENTP1-T2325 Emit vaultClosed on Back Button in All Click to Pay Views',
      { tag: ['@smoke', '@team_payment_integration'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const formsPage = new FormsPage(page);
        const clickToPayFormPage = new ClickToPayFormPage(page, language);

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
        await test.step('Widget is visible', async () => {
          await clickToPayFormPage.widgetIsVisible();
        });
        await test.step('User clicks in back button', async () => {
          await clickToPayFormPage.clickOnBack();
        });
        await test.step('Widget is closed', async () => {
          await clickToPayFormPage.widgetIsNotVisible();
        });
      }
    );
  }
);
