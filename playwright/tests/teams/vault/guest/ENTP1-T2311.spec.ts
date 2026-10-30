import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { newCustomStyle } from '@support/mocks/newcustomStyle';
import { randomUUID } from 'crypto';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
const validatedCustomStyle = {
  ...newCustomStyle,
  theme: {
    ...newCustomStyle.theme,
    inputs: {
      inputMode: 'none',
    },
  },
};
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
  elementsConfig: {
    init_with_guest_user: true,
    user_authentication_flow: false,
    theme_config: [
      {
        id: randomUUID(),
        name: 'new_theme_config',
        config: JSON.stringify(validatedCustomStyle),
      },
    ],
  },
};

test.describe(
  '@regression Comportamiento sin validación ni íconos en inputMode none ',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mercadoPagoProcessor,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: userEmail,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createCampaignMCI('MXN', merchantId, merchantToken);

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test.beforeEach(
      'The user opens the testing page and opens the formularios page',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios', true, true);
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2311 Usuario Guest - Comportamiento sin validación ni íconos en inputMode none',
      { tag: ['@smoke', '@auth', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        await paymentPage.clickOnPayButtonEmbedded();
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Validate input styles in default mode', async () => {
          await vaultWidgetPage.expectSuccessValidatorIsHidden();
          await vaultWidgetPage.fillCardForm(creditCardData.mercadoPagoVisaCardSuccessful, {
            avoidInstallmentsCall: true,
            country: 'MX',
          });
          await vaultWidgetPage.expectClearInputIsHidden();
        });
      }
    );
  }
);
