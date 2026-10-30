import { test } from '@deuna/test';
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
import { customStyleForSplitPayment } from '@support/mocks/customStyleForSplitPayment';

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
const amountCard1 = '.3103.17';
const valueCard2 = '1,329.93';
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
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
};

test.describe(
  '@regression Personalizaciones desde CSS para flujo split payment',
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
      '@ENTP1-T2177 Personalizaciones desde CSS para flujo split payment',
      { tag: ['@smoke', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        await paymentPage.clickOnPayButtonEmbedded();
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Fill card 1 in card form', async () => {
          await paymentDeunaNowPage.fillCardForm(creditCardData.mercadopagoMasterCardSuccessful, {
            country: 'CO',
          });
        });

        await test.step('Fill Billing form', async () => {
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
          await vaultWidgetPage.fillBillingForm('Bogotá D.C.', 'Bogotá D.C.');
          await paymentDeunaNowPage.clickToSaveFormButton();
        });

        await test.step('Fill card 2 in card form and assert text for card 2', async () => {
          await vaultWidgetPage.clickPayWithTwoCards();
          await vaultWidgetPage.assertTextIsVisible(
            customStyleForSplitPayment.SplitPaymentPage.translations.es.common.enterCardDataLabel
          );
          await vaultWidgetPage.assertTextIsVisible(
            customStyleForSplitPayment.SplitPaymentPage.translations.es.amountToPayCard.title
          );
          await vaultWidgetPage.adjustAmountForCard1(amountCard1);
          await vaultWidgetPage.clickContinueWithCard2();
          await paymentDeunaNowPage.fillCardForm(creditCardData.mercadopagoMasterCardSuccessfulCO, {
            country: 'CO',
          });
        });

        await test.step('Verify order information', async () => {
          await vaultWidgetPage.clickContinueWithThePaymentSummary();
          await vaultWidgetPage.assertSummaryTitle();
          await page.waitForTimeout(3000);
          await vaultWidgetPage.assertAdjustAmountForCard2(valueCard2);
          await vaultWidgetPage.assertTextIsVisible(
            customStyleForSplitPayment.SplitPaymentPage.translations.es.lastStep.title
          );
          await vaultWidgetPage.assertTextIsVisible(
            customStyleForSplitPayment.SplitPaymentPage.translations.es.stepper.backToSinglePayment
          );
        });
      }
    );
  }
);
