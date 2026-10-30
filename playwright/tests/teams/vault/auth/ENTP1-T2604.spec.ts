import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { CheckoutModulesForWidgetConfig } from '@support/interfaces/CheckoutConfigurationV2';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { randomUUID } from 'crypto';
import { fullElementsCustomStyle } from '@support/mocks/customStyles/fullElements';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();

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

// Saved cards seeded for the authenticated user — must remain hidden when
// onlyCardEnrollment is active, even though the user already has cards on file.
const savedCard1 = creditCardData.mercadoPagoVisaCardSuccessful;
const savedCard2 = creditCardData.mercadopagoMasterCardSuccessfulCO;

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
    init_with_guest_user: false,
    user_authentication_flow: true,
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
  '@regression Elements (Vault): Validate complete CustomStyle configuration with onlyCardEnrollment for an authenticated user',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let merchantToken: string;
    let userToken: string;

    test.beforeAll(async ({ userAuthService }) => {
      const userEmail = EmailGenerator.generateRegisteredUserEmail();

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

      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardCO.phone,
          identity_document: creditCardData.mercadoPagoVisaCardSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        savedCard1,
        userAddressCreditCard.userAddressCreditCardCO,
        merchantId,
        privateKey
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        savedCard2,
        userAddressCreditCard.userAddressCreditCardCO,
        merchantId,
        privateKey
      );

      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);
    });

    test.beforeEach(
      'The user opens the testing page and opens the formularios page',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.setUpExplore({
          orderToken: '',
          withOnlyCardEnrollment: true,
          userToken,
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
      '@ENTP1-T2604 Elements (Vault): Validate complete CustomStyle configuration with onlyCardEnrollment for an authenticated user',
      { tag: ['@team_enterprise', '@custom_style'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);
        const { colors, typography, buttons, inputs } = fullElementsCustomStyle.theme;

        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK)');
        await paymentPage.clickOnPayButtonEmbedded();

        await test.step('onlyCardEnrollment: the new card flow renders immediately instead of the saved-cards view', async () => {
          await vaultWidgetPage.assertNewCardFlowRendersImmediately();
        });

        await test.step('Fill card in the new card form', async () => {
          await paymentDeunaNowPage.fillCardForm(creditCardData.mercadoPagoVisaCardSuccessful, {
            country: 'CO',
          });
        });

        await test.step('theme.colors incl. buttonPrimaryText/Hover/Active: applied on the card form', async () => {
          await vaultWidgetPage.assertThemeConfigCustomStyles({
            ...colors,
            primaryFontFamily: typography.primaryFontFamily,
          });
        });

        await test.step('theme.buttons: border-radius and height on the pay button', async () => {
          await vaultWidgetPage.assertButtonDimensions(buttons);
        });

        await test.step('BillingPattern: title translation and required-field labels', async () => {
          await vaultWidgetPage.assertCustomStyleTextIsVisible(
            fullElementsCustomStyle.BillingPattern.translations.es.title
          );
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
        });

        await test.step('theme.inputs: border-radius and height on the billing form', async () => {
          await vaultWidgetPage.assertInputsDimensions(inputs);
          await vaultWidgetPage.fillBillingForm('Bogotá D.C.', 'Bogotá D.C.');
          await paymentDeunaNowPage.clickToSaveFormButton();
        });

        await test.step('Complete the new card enrollment', async () => {
          await vaultWidgetPage.clickOnSave();
          await vaultWidgetPage.assertEventWasFired('vaultSaveSuccess');
        });
      }
    );
  }
);
