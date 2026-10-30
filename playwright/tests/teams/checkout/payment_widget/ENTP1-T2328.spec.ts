import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { VaultWidgetFormPage } from '@pages/explore/forms/vault_widget/vaultWidgetFormPage';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();

const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules: [
      {
        name: 'BillingPattern',
        props: {
          show_in_main_view: false,
          fields: [
            {
              name: 'country',
              validation: {
                required: true,
              },
            },
            {
              name: 'zipcode',
              validation: {
                required: true,
              },
            },
          ],
        },
      },
    ],
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
  '@regression Usuario autenticado sin OTP ',
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
      const userEmail = EmailGenerator.generateRegisteredUserEmail();

      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: userEmail,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      // Register user and set address
      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.mercadoPagoVisaCardSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.mercadoPagoVisaCardSuccessful,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2328 El callback onResize es llamado cuando cambia el contenido del Vault Widget - widget embebido',
      {
        tag: [
          '@smoke',
          '@admin_connection',
          '@admin-preprod',
          '@preprod',
          '@checkout_ui',
          '@team_enterprise',
        ],
      },
      async ({ page }) => {
        const vaultWidgetFormPage = new VaultWidgetFormPage(page);

        const adminHomePage = new AdminHomePage(page, 'ES');
        const adminLoginPage = new AdminLoginPage(page);

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user navigates to the payment screen as guest user', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            userToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Select Vault Embedded Widget Option', async () => {
          await vaultWidgetFormPage.selectVaultWidgetFormAndClickOnEmbedPayButton();
        });

        await test.step('Assert Vault Widget Container is visible', async () => {
          await vaultWidgetFormPage.assertVaultWidgetContainerIsVisible();
        });

        await test.step('Assert Vault Widget Container is resized after payment form is loaded', async () => {
          await vaultWidgetFormPage.assertVaultWidgetContainerIsResizedAfterPaymentFormIsLoaded();
        });

        await test.step('Assert Vault Widget Container is resized when billing form is shown', async () => {
          await vaultWidgetFormPage.assertVaultWidgetContainerIsResizedWhenBillingFormIsShown();
        });
      }
    );
  }
);
