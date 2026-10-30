import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { getCustomConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
//Text is hardcoded because it is a customization of the widget
const customTitle = 'Pago con tarjeta de crédito o débito 🚀';
const customSubTitle = 'Ingresa los datos de tu tarjeta 🚀';
const customConfig = {
  PaymentMethodsPattern: {
    translations: {
      es: {
        paymentMethods: {
          info: {
            card: {
              title: customTitle,
              subtitle: customSubTitle,
            },
          },
        },
      },
    },
  },
};
const customThemeConfig = getCustomConfig(customConfig);
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
  '@regression configure merchant with a custom theme that includes title and subtitle in vault.',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async () => {
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
    });

    test(
      '@ENTP1-T2365 Checkout - Payment Methods Pattern: Validate custom title and subtitle',
      {
        tag: [
          '@smoke',
          '@admin_connection',
          '@preprod',
          '@checkout_ui',
          '@admin-preprod',
          '@team_enterprise',
        ],
      },
      async ({ page, emaService }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);
        const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);
        await test.step('Configure merchant', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
          await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
        });
        await test.step('Configure campaign', async () => {
          await apiCallNewman.createCampaignMCI('COP', merchantId, merchantToken);
        });
        await test.step('Configure vault widget', async () => {
          await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
        });
        await test.step('Tokenize order', async () => {
          const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
            user_email: userEmail,
            amount: 250000,
          });
          orderToken = tokenized.data.token;
          orderId = tokenized.data.order.order_id;
        });
        await test.step('The user opens the testing page and opens the vault widget', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Vault (Web SDK)');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should validate title and subtitle', async () => {
          await vaultWidgetPage.assertCustomTitleAndSubtitle(customTitle, customSubTitle);
        });
      }
    );
  }
);
