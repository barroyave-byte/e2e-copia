import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { EcommercePage } from '@pages/explore/ecommercePage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutModulesForWidgetConfig } from '@support/interfaces/CheckoutConfigurationV2';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { randomUUID } from 'crypto';
import { fullElementsCustomStyle } from '@support/mocks/customStyles/fullElements';

const configMerchant = new ConfigMerchant();

const checkout_modules: CheckoutModulesForWidgetConfig[] = [
  {
    name: 'BillingPattern',
    props: {
      fields: [
        { name: 'address1', validation: { required: true } },
        { name: 'state_name', validation: { required: true } },
        { name: 'city', validation: { required: true } },
      ],
      show_in_main_view: false,
    },
  },
];
const amountCard1 = '.3103.17';
const valueCard2 = '1,329.93';
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules,
    user_experience: { show_saved_cards_flow: true },
  },
  elementsConfig: {
    ...newElementsConfig,
    theme_config: [
      {
        id: randomUUID(),
        name: 'new_theme_config',
        config: JSON.stringify(fullElementsCustomStyle),
      },
    ],
  },
};

test.describe(
  '@regression Elements: Validate complete CustomStyle configuration in Payment Vault',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let merchantToken: string;

    test.beforeAll(async () => {
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      merchantToken = merchant.merchantToken;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mercadoPagoProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createConfigurationV2(
        {
          widgetGeneralsConfig: generalWidgetConfig.widgets_general_config,
          elementsConfig: generalWidgetConfig.elementsConfig,
        },
        merchantId,
        merchantToken
      );
      await apiCallNewman.createNetwork(merchantId, merchantToken);
    });

    test.beforeEach(
      'The user opens the testing page and opens the formularios page',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios', false, true);
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
      '@ENTP1-T2603 Elements: Validate complete CustomStyle configuration in Payment Vault',
      { tag: ['@team_enterprise', '@custom_style'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK)');
        await paymentPage.clickOnPayButtonEmbedded();
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);
        const { colors, typography, buttons, inputs } = fullElementsCustomStyle.theme;
        const splitTranslations = fullElementsCustomStyle.SplitPaymentPage.translations.es;

        await test.step('Fill card 1 in card form', async () => {
          await paymentDeunaNowPage.fillCardForm(creditCardData.mercadopagoMasterCardSuccessful, {
            country: 'CO',
          });
        });

        await test.step('theme.colors incl. buttonPrimaryText/Hover/Active: applied on the card form', async () => {
          await vaultWidgetPage.assertThemeConfigCustomStyles({
            ...colors,
            primaryFontFamily: typography.primaryFontFamily,
          });
        });

        await test.step('BillingPattern: title translation and required-field labels', async () => {
          await vaultWidgetPage.assertCustomStyleTextIsVisible(
            fullElementsCustomStyle.BillingPattern.translations.es.title
          );
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
        });

        await test.step('theme.buttons + theme.inputs: border-radius and height on the billing form', async () => {
          await vaultWidgetPage.assertInputsDimensions(inputs);
          await vaultWidgetPage.fillBillingForm('Bogotá D.C.', 'Bogotá D.C.');
          await paymentDeunaNowPage.clickToSaveFormButton();
        });

        await test.step('SplitPaymentPage: fill card 2 and assert stepper/common translations', async () => {
          await vaultWidgetPage.clickPayWithTwoCards();
          await vaultWidgetPage.assertTextIsVisible(splitTranslations.common.enterCardDataLabel);
          await vaultWidgetPage.assertTextIsVisible(splitTranslations.amountToPayCard.title);
          await vaultWidgetPage.adjustAmountForCard1(amountCard1);
          await vaultWidgetPage.clickContinueWithCard2();
          await paymentDeunaNowPage.fillCardForm(creditCardData.mercadopagoMasterCardSuccessfulCO, {
            country: 'CO',
          });
        });

        await test.step('SplitPaymentPage: payment summary translations and ordinals', async () => {
          await vaultWidgetPage.clickContinueWithThePaymentSummary();
          await vaultWidgetPage.assertSummaryTitle();
          await vaultWidgetPage.assertAdjustAmountForCard2(valueCard2);
          await vaultWidgetPage.assertTextIsVisible(splitTranslations.lastStep.title);
          await vaultWidgetPage.assertTextIsVisible(splitTranslations.stepper.backToSinglePayment);
        });

        await test.step('Both cards must be visible in the split payment summary', async () => {
          await vaultWidgetPage.assertFirstSplitSummaryCardBrand();
        });

        await test.step('Confirm payment by clicking save cards', async () => {
          await vaultWidgetPage.clickOnSaveCards();
        });
      }
    );
  }
);
