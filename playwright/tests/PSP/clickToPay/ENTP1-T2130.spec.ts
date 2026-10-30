import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { FormsPage } from '@pages/explore/formsPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { ClickToPayPage } from '@pages/clickToPay/clickToPayPage';
import { avoidAntibot } from '@support/utils/avoidAntibot';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import { getCustomThemeConfig } from '@support/mocks/newThemeConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantVault = new ConfigMerchant();
const email = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression Click to Pay Purchase - MX',
  { tag: ['@checkout', '@elements_link', '@click_to_pay'] },
  () => {
    let orderToken: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService, checkoutConfigurationService }) => {
      const merchantSetup = await configMerchantVault.basicSetup('MX');
      const { merchantId, merchantToken } = merchantSetup;
      privateKey = merchantSetup.privateKey;
      publicKey = merchantSetup.publicKey;

      const customConfig = {
        buttons: { borderRadius: '20px' },
        inputs: { borderRadius: '50%' },
      };
      const customThemeConfig = getCustomThemeConfig(customConfig);

      await checkoutConfigurationService.configClickToPay(merchantId, merchantToken, [
        { id: 'test', name: 'default', config: JSON.stringify(customThemeConfig) },
      ]);

      orderToken = (
        await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
          privateKey,
          DeunaPaymentLinkOrderBuilder.createBody({
            user_email: email,
            country_code: 'CO',
            first_name: 'John',
            last_name: 'Doe',
            checkout_modules: [],
          })
        )
      ).data.token;

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
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2130 Elements: Click to Pay CC Form error messages',
      { tag: ['@smoke', '@team_payment_integration'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const formsPage = new FormsPage(page);
        const clickToPayPage = new ClickToPayPage(page);

        await test.step('Should select Click to Pay as a Payment Method', async () => {
          await paymentPage.selectPaymentMethodById('payment_method_click_to_pay');
        });

        await test.step('Should open Click To Pay Form', async () => {
          await formsPage.clickOnPay();
        });

        await test.step('Assert Errors', async () => {
          await clickToPayPage.clickOnContinue();
          await clickToPayPage.assertCardFormErrorMessages();
        });

        await test.step('Fill credit card information', async () => {
          await clickToPayPage.fillCardInfo(creditCardData.clickToPayMastercardSuccess);
        });

        await test.step('Remove Card Holder Information', async () => {
          await clickToPayPage.clearInputCardHolder();
        });

        await test.step('Ensure that wont let continue without cardholder', async () => {
          await clickToPayPage.clickOnContinue();
          await clickToPayPage.assertCardHolderError();
        });
      }
    );
  }
);
