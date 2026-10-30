import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { FormsPage } from '@pages/explore/formsPage';
import { ClickToPayFormPage } from '@pages/explore/forms/clickToPayFormPage';
import { avoidAntibot } from '@support/utils/avoidAntibot';
import * as creditCardData from '@support/interfaces/credit_cards';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import { getCustomThemeConfig } from '@support/mocks/newThemeConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantVault = new ConfigMerchant();
const languageConfigs = [
  { language: 'PT', country: 'BR' },
  { language: 'EN', country: 'US' },
  { language: 'ES', country: 'MX' },
] as const;

test.describe(
  '@regression Click to Pay Purchase - MX',
  { tag: ['@checkout', '@elements_link', '@click_to_pay'] },
  () => {
    for (const { language, country } of languageConfigs) {
      const email = EmailGenerator.generateRegisteredUserEmail();

      test.describe(`Idioma: ${language}`, () => {
        test.beforeEach(async ({ page, emaService, checkoutConfigurationService }) => {
          const { privateKey, publicKey, merchantId, merchantToken } =
            await configMerchantVault.basicSetup('MX');

          const customConfig = {
            buttons: { borderRadius: '20px' },
            inputs: { borderRadius: '50%' },
          };
          const customThemeConfig = getCustomThemeConfig(customConfig);

          await checkoutConfigurationService.configClickToPay(merchantId, merchantToken, [
            { id: 'test', name: 'default', config: JSON.stringify(customThemeConfig) },
          ]);
          const orderToken = (
            await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
              privateKey,
              DeunaPaymentLinkOrderBuilder.createBody({
                user_email: '',
                country_code: 'MX',
                first_name: 'John',
                last_name: 'Doe',
                checkout_modules: [],
                order_id: `click_to_pay_${Math.floor(Math.random() * 9999999)}`,
              })
            )
          ).data.token;
          await apiCallNewman.createPaymentProcessor(
            processorsConfig.globalpayProcessor,
            merchantId,
            merchantToken
          );

          await avoidAntibot(page);
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            language,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        test(
          `@ENTP1-T2324 MultiLanguage Support in Click2Pay Based on Widget Initialization - ${language}`,
          { tag: ['@smoke', '@team_payment_integration'] },
          async ({ page }) => {
            const paymentPage = new PaymentPage(page, language);
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
            await test.step('Click continue button', async () => {
              await clickToPayFormPage.clickOnContinue();
            });
            await test.step('Should see Collect Email Page Title', async () => {
              await clickToPayFormPage.assertUserDataHeadings();
            });
            await test.step('Should see Payment Section Headings', async () => {
              await clickToPayFormPage.assertPaymentsHeadings();
            });
            await test.step('Fill credit card information', async () => {
              await page.waitForTimeout(500);
              await clickToPayFormPage.fillCardInfo(creditCardData.clickToPayMastercardSuccess);
            });
            await test.step('Click continue button', async () => {
              await clickToPayFormPage.clickOnContinue();
            });

            await test.step('Mastercard User Info Fill', async () => {
              await clickToPayFormPage.acceptCookiePolicyIfPresent(country);
              await clickToPayFormPage.assertMastercardHasProperLocaleText(country);
            });
          }
        );
      });
    }
  }
);
