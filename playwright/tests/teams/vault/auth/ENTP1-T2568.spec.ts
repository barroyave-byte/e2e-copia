import { test, expect } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutModulesForWidgetConfig } from '@support/interfaces/CheckoutConfigurationV2';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();
const globalAssert = new GlobalAssert();

const userEmail = EmailGenerator.generateRegisteredUserEmail();

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

const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules,
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
  '@regression Auth - new card form is preserved after returning from Billing',
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
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: userEmail,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createCampaignMCI('MXN', merchantId, merchantToken);

      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.kushkiVisaSuccessfull.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      // Default card (Visa)
      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.kushkiVisaSuccessfull,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      // Non-default card (Mastercard). Saved cards are listed by expiration_date, and both
      // Kushki cards expire on 11/27: with the tie, either card could come first and be
      // preselected. A later expiration keeps the Visa first.
      await apiCallNewman.setCreditCardForUser(
        userEmail,
        { ...creditCardData.kushkiMasterCardExitosa, expiration_date: '1228' },
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test.beforeEach(
      'The user opens the testing page and opens the formularios page',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios', true, true);
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          userToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2568 Auth: new card form is preserved after returning from Billing',
      {
        tag: [
          '@auth',
          '@user_auth',
          '@vault_purchase',
          '@team_enterprise',
          '@preprod',
          '@checkout_ui',
        ],
      },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        const lastFour = creditCardData.kushkiVisaSuccessfull.number.slice(-4);

        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK)');
        await paymentPage.clickOnPayButtonEmbedded();

        await test.step('Fill initial Billing form', async () => {
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
          await vaultWidgetPage.fillBillingForm('Nayarit', 'Tepic');
          await paymentDeunaNowPage.clickToSaveFormButton();
        });

        const defaultCard = creditCardData.kushkiVisaSuccessfull;
        const defaultCardLastNumbers = `**** ${defaultCard.number.slice(-4)}`;

        await test.step('Verify default saved card (Visa) is visible', async () => {
          await vaultWidgetPage.assertSavedCardIsVisible(defaultCardLastNumbers);
        });

        await test.step('Switch to new card form and fill it', async () => {
          await vaultWidgetPage.clickOnAddNewCard();
          await vaultWidgetPage.assertSaveCardToggleIsVisible();
          await vaultWidgetPage.fillFormVault(creditCardData.kushkiVisaSuccessfull, {
            avoidInstallmentsCall: true,
            country: 'MX',
          });
        });

        await test.step('Navigate to Billing and update it', async () => {
          await vaultWidgetPage.buttonUpdateBillingData.click();
          await vaultWidgetPage.assertBillingFormTitleIsVisible();
          await vaultWidgetPage.fillBillingForm('Aguascalientes', 'Arellano');
          await vaultWidgetPage.clickSaveBillingForm();
        });

        await test.step('BUG CHECK: new card form must remain visible — selection must NOT reset to UserCard', async () => {
          await vaultWidgetPage.assertNewCardFormIsVisibleAfterBilling();
        });

        await test.step('Complete purchase with new card and assert order status', async () => {
          await vaultWidgetPage.clickOnPay();
        });
        await test.step('Assert purchase V2 response returns processed status with correct card', async () => {
          const response = await vaultWidgetPage.assertOrderStatusRequestPurchaseV2(
            'processed',
            200
          );
          const lastFourResponse = response.order.payment.data.from_card.last_four;
          expect(lastFourResponse, 'Last four digits should match the card used for purchase').toBe(
            lastFour
          );
        });

        await test.step('Assert transaction payment status is processed in the admin', async () => {
          await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
        });
      }
    );
  }
);
