import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { AccountPage } from '@pages/explore/accountPage';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { randomUUID } from 'crypto';
import { fullElementsCustomStyle } from '@support/mocks/customStyles/fullElements';
import { DEFAULT_USER_DATA } from '@support/http/testData/user_auth';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const savedCard = creditCardData.mercadoPagoVisaCardSuccessful;

const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    user_experience: { show_saved_cards_flow: true },
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
  '@regression Elements: Validate complete CustomStyle configuration in Payment Vault opened from the authenticated Payment Methods flow',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let merchantToken: string;
    let userEmail: string;

    test.beforeAll(async ({ userAuthService }) => {
      userEmail = EmailGenerator.generateRegisteredUserEmail();

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
          identity_document: savedCard.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        savedCard,
        userAddressCreditCard.userAddressCreditCardCO,
        merchantId,
        privateKey
      );
    });

    test.beforeEach(
      'The user opens the testing page and configures the widget with only-card-enrollment',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.setUpExplore({
          orderToken: '',
          withOnlyCardEnrollment: true,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2605 Elements: Validate complete CustomStyle configuration in Payment Vault opened from the authenticated Payment Methods flow',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const accountPage = new AccountPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);
        const { colors, typography } = fullElementsCustomStyle.theme;

        await test.step('Authenticate the user via the login flow', async () => {
          await accountPage.login(userEmail);
          await accountPage.assertWelcomeUserIsVisible(DEFAULT_USER_DATA.first_name);
          await accountPage.clickInUserProfile();
        });

        await test.step('Open Payment Methods and open the embedded Payment Vault', async () => {
          await accountPage.clickPaymentMethodsButton();
          await accountPage.assertCardsListContainerIsVisible();
          await accountPage.openPaymentVault('embedded');
        });

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

        await test.step('Confirm to save', async () => {
          await vaultWidgetPage.clickOnSave();
        });

        await test.step('The newly saved card appears in the Payment Methods list', async () => {
          const lastFourDigits = creditCardData.mercadopagoMasterCardSuccessful.number.slice(-4);
          await accountPage.assertCardIsVisibleInList(lastFourDigits);
        });
      }
    );
  }
);
