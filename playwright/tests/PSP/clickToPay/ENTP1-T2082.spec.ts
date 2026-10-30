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
import createBasicOrder from '@support/mocks/orders/basicOrder';
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

      const basicOrder = createBasicOrder();
      const payloadOrder = {
        order: {
          ...basicOrder.order,
          shipping_address: {
            ...basicOrder.order.shipping_address,
            // to raise flow without predefined email
            email: '',
          },
          billing_address: {
            ...basicOrder.order.billing_address,
            // to raise flow without predefined email
            email: '',
          },
        },
      };

      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, payloadOrder as any))
        .data.token;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.nuveiProcessor,
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
      '@ENTP1-T2082 Payment Widget: Guest Flow without predefined email',
      { tag: ['@smoke', '@team_payment_integration'] },
      async ({ page }) => {
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
        await test.step('Fill credit card information', async () => {
          await clickToPayFormPage.fillCardInfo(creditCardData.clickToPayMastercardSuccess);
        });
        await test.step('Click continue button', async () => {
          await clickToPayFormPage.clickOnContinue();
        });
        await test.step('Mastercard User Info Fill', async () => {
          await clickToPayFormPage.fillMastercardUserInfo();
        });
        await test.step('The thank you page should be displayed on the merchant', async () => {
          await paymentPage.assertThankyouPage('Pago completado');
        });
      }
    );
  }
);
