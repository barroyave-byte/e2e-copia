import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { randomUUID } from 'crypto';
import { customStyleForSplitPayment } from '@support/mocks/customStyleForSplitPayment';
import { CheckoutModulesForWidgetConfig } from '@support/interfaces/CheckoutConfigurationV2';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';

const configMerchant = new ConfigMerchant();

const checkout_modules: CheckoutModulesForWidgetConfig[] = [
  {
    name: 'BillingPattern',
    props: {
      fields: [
        {
          name: 'address1',
          validation: {
            required: true,
          },
        },
        {
          name: 'state_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'city',
          validation: {
            required: true,
          },
        },
      ],
      show_in_main_view: false,
    },
  },
];
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  elementsConfig: {
    ...newElementsConfig,
    theme_config: [
      {
        id: randomUUID(),
        name: 'new_theme_config',
        config: JSON.stringify(customStyleForSplitPayment),
      },
    ],
  },
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
};

test.describe(
  '@regression Elements: E2E de tipografía Roboto',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async () => {
      const merchant = await configMerchant.basicSetup('CO');
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
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test.beforeEach(
      'The user opens the testing page and opens the payment vault modal',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)', false);
        await testingTool.setUpExplore({
          orderToken: '',
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        const ecommercePage = new EcommercePage(page);
        await ecommercePage.clickOnProduct();
        await ecommercePage.addToCart();
        await ecommercePage.clickOnIconBasket();
        await testingTool.navigateToSelectOrderType();
      }
    );

    test(
      '@ENTP1-T2180 Elements: E2E de tipografía Roboto',
      { tag: ['@smoke', '@review_action', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('The user validates the custom styles', async () => {
          await vaultWidgetPage.assertThemeConfigCustomStyles({
            buttonPrimaryText: customStyleForSplitPayment.theme.colors.buttonPrimaryText,
            primaryTextColor: customStyleForSplitPayment.theme.colors.primaryTextColor,
            buttonPrimaryFill: customStyleForSplitPayment.theme.colors.buttonPrimaryFill,
            backgroundPrimary: customStyleForSplitPayment.theme.colors.backgroundPrimary,
            primaryFontFamily: customStyleForSplitPayment.theme.typography.primaryFontFamily,
          });
        });
      }
    );
  }
);
