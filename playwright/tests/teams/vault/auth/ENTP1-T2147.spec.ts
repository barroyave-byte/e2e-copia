import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { getCustomThemeConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { faker } from '@faker-js/faker';
import { test } from '@support/fixtures';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
const body_register_user = {
  email: userEmail,
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  phone: `+57${faker.string.numeric(10)}`,
  identity_document: faker.string.numeric(9),
};
const customConfig = {
  buttons: { borderRadius: '20px' },
  inputs: { borderRadius: '50%' },
};
const customThemeConfig = getCustomThemeConfig(customConfig);
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
  elementsConfig: {
    theme_config: customThemeConfig,
    init_with_guest_user: true,
    user_authentication_flow: false,
  },
};

test.describe(
  '@regression configure merchant with a custom theme that includes border radius for buttons and inputs.',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      const registerResponse = await userAuthService.registerUser({
        merchantPrivateKey: merchant.privateKey,
        merchantId: merchant.merchantId,
        data: body_register_user,
      });
      const { token: userToken, user_id: userId } = registerResponse.data;

      const baseCardData = {
        expiry_month: '01',
        expiry_year: '2039',
        card_holder: 'Jean Roldan',
        card_holder_dni: '1315722768',
        address1: 'Santo Domingo 1',
        zip: '1215',
        city: 'Santo Domingo',
        state: 'Distrito Nacional',
        country: 'MX',
        phone: '12345755',
      };
      await userAuthService.setCard({
        userId,
        userToken,
        data: { ...baseCardData, card_number: '378282246310005', card_cvv: '0000' },
      });
      await userAuthService.setCard({
        userId,
        userToken,
        data: { ...baseCardData, card_number: '4111111111111111', card_cvv: '123' },
      });
      await userAuthService.setCard({
        userId,
        userToken,
        data: { ...baseCardData, card_number: '4242424242424242', card_cvv: '123' },
      });

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: userEmail,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Vault (Web SDK)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2147 Custom border radius for inputs and buttons',
      { tag: ['@smoke', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('validate pay button border radius', async () => {
          await vaultWidgetPage.assertBorderRadius(
            vaultWidgetPage.btnPay,
            customConfig.buttons.borderRadius
          );
        });

        await test.step('validate inputs border radius', async () => {
          await vaultWidgetPage.assertInputsBorderRadius(customConfig.inputs.borderRadius);
        });
      }
    );
  }
);
