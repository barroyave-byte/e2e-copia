import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const userEmail = EmailGenerator.generateRegisteredUserEmail();
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
  elementsConfig: {
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

test.describe(
  '@regression Elements: Test that card save request is not called with invalid card data but is called with valid data',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let userToken: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardCO.phone,
          identity_document: creditCardData.globalpayVisaSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      const userLoginResponse = await userAuthService.loginUserTypeSms(
        userEmail,
        '010101',
        merchantId,
        privateKey
      );
      userToken = userLoginResponse.token;

      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: userEmail,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          userToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2127 Elements: Test that card save request is not called with invalid card data but is called with valid data',
      { tag: ['@smoke', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('fill invalid card form', async () => {
          // The cardholder name validation requires both a first and last name.
          // Using 'VISA' is invalid because it is treated as a single name.
          await vaultWidgetPage.fillFormVault(
            {
              ...creditCardData.globalpayVisaSuccessful,
              cardholder_name: 'VISA',
            },
            { avoidInstallmentsCall: true, country: 'CO' }
          );
        });

        await test.step('click on save and show alert invalid card message', async () => {
          await vaultWidgetPage.clickOnSave();
          await vaultWidgetPage.assertAlertInvalidCardInfo();
        });

        await test.step('fill valid card form', async () => {
          await vaultWidgetPage.fillFormVault(creditCardData.globalpay3DS, {
            avoidInstallmentsCall: true,
            country: 'CO',
          });
        });

        await test.step('click on save and verify card POST request called', async () => {
          await vaultWidgetPage.clickOnSaveWaitingForCardRequestCalled();
          await vaultWidgetPage.assertCardRequest();
        });
      }
    );
  }
);
