import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { faker } from '@faker-js/faker';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
const bodyRegisterUser = {
  email: userEmail,
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  phone: `+57${faker.string.numeric(10)}`,
  identity_document: faker.string.numeric(9),
};
const generalWidgetConfig = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    user_experience: {
      ...widgetsGeneralConfig.user_experience,
      show_saved_cards_flow: true,
      default_card_flow: true,
    },
  },
};

test.describe(
  '@regression create a new card and set as default',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let userToken: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchantSetup = await configMerchant.basicSetup('MX');
      const { merchantId, merchantToken } = merchantSetup;
      privateKey = merchantSetup.privateKey;
      publicKey = merchantSetup.publicKey;

      const registerResponse = await userAuthService.registerUser({
        merchantPrivateKey: privateKey,
        merchantId,
        data: bodyRegisterUser,
      });

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
        userId: registerResponse.data.user_id,
        userToken: registerResponse.data.token,
        data: { ...baseCardData, card_number: '371449635398431', card_cvv: '0000' },
      });
      await userAuthService.setCard({
        userId: registerResponse.data.user_id,
        userToken: registerResponse.data.token,
        data: { ...baseCardData, card_number: '4111111111111111', card_cvv: '123' },
      });

      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.paymentezProcessor,
        merchantId,
        merchantToken
      );

      orderToken = (
        await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
          user_email: userEmail,
          amount: 250000,
        })
      ).data.token;
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Vault (Web SDK)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          userToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2138 Create a new card and set as default',
      { tag: ['@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);
        const newCard = creditCardData.conektaVisaCardSuccessful;
        const newCardLastNumbers = `**** ${newCard.number.slice(-4)}`;

        await test.step('see add new card form', async () => {
          await vaultWidgetPage.addNewCard();
        });

        await test.step('fill new card form', async () => {
          await vaultWidgetPage.pressFormVault(newCard, { country: 'MX' });
          await vaultWidgetPage.assertButtonEnabled();
        });

        await test.step('set checkbox values', async () => {
          await vaultWidgetPage.setCheckboxValue(vaultWidgetPage.checkboxSaveCard, true);
          await vaultWidgetPage.setCheckboxValue(vaultWidgetPage.checkboxSaveCardAsDefault, true);

          await vaultWidgetPage.assertCheckboxValue(vaultWidgetPage.checkboxSaveCard, true);
          await vaultWidgetPage.assertCheckboxValue(
            vaultWidgetPage.checkboxSaveCardAsDefault,
            true
          );
        });

        await test.step('click on pay', async () => {
          await vaultWidgetPage.clickOnSaveCards();
          await vaultWidgetPage.buttonGetBack.waitFor({ state: 'visible', timeout: 10000 });
          await vaultWidgetPage.clickForced(vaultWidgetPage.buttonGetBack);
        });

        await test.step('re-open widget', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Vault (Web SDK)');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            userToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('see all tokenized cards', async () => {
          await vaultWidgetPage.seeMoreCards();
          await vaultWidgetPage.assertElementNotVisible(vaultWidgetPage.buttonSeeMoreCards);
        });

        await test.step('validate default card', async () => {
          await vaultWidgetPage.assertDefaultCardSet(newCardLastNumbers);
        });
      }
    );
  }
);
