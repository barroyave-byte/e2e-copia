import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as userData from '@support/interfaces/user_data';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression lista de tarjetas de usuario autenticado ordenada por expiration_date.',
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
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.globalpayVisaSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, {
        widgets_general_config: {
          theme: {
            main_color: '',
            secondary_color: '',
            background_color: '',
            font: '',
            image: {
              name: '',
              url: '',
            },
            banner: '',
            main_action_button_text: '',
          },
          user_experience: {
            show_saved_cards_flow: true,
            disable_login: false,
            init_with_guest_user: false,
            user_authentication_flow: true,
          },
          flags: {},
          currencies: {
            minor_units: [],
          },
          checkout_modules: [],
        },
        elementsConfig: {
          init_with_guest_user: false,
          user_authentication_flow: true,
        },
      });

      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: userEmail,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createCampaignMSI('COP', merchantId, merchantToken);

      await apiCallNewman.setCreditCardForUserInNetwork(
        userEmail,
        creditCardData.globalpay3DS,
        userAddressCreditCard.userAddressCreditCardMX,
        userData.userDataMX,
        privateKey
      );

      await apiCallNewman.setCreditCardForUserInNetwork(
        userEmail,
        creditCardData.globalpayVisaSuccessful,
        userAddressCreditCard.userAddressCreditCardMX,
        userData.userDataMX,
        privateKey
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2002 lista de tarjetas de usuario autenticado ordenada por expiration_date.',
      {
        tag: ['@installments', '@team_enterprise'],
        annotation: { type: 'bug', description: 'ENTP1-14191' },
      },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Fill Otp', async () => {
          await vaultWidgetPage.enterOtpCode();
        });

        await test.step('validate firts card selected', async () => {
          await vaultWidgetPage.assertCardPreSelected(creditCardData.globalpay3DS.number);
        });

        await test.step('user click on see more cards', async () => {
          await vaultWidgetPage.seeMoreCards();
        });
      }
    );
  }
);
