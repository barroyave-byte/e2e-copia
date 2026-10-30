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

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();
const globalAssert = new GlobalAssert();

const userEmail = `${Math.floor(Math.random() * 9999999)}.qa@testuser.com`;

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
  '@regression Auth - non-default saved card stays selected after returning from Billing',
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
        processorsConfig.nuveiProcessor,
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
          identity_document: creditCardData.nuveiMasterCardSucessfull.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      // Default card (Mastercard)
      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.nuveiMasterCardSucessfull,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      // Non-default card (Visa). Saved cards are listed by expiration_date, and both Nuvei cards
      // expire on 11/27: with the tie, either card could come first and be preselected. A later
      // expiration keeps the Mastercard first.
      await apiCallNewman.setCreditCardForUser(
        userEmail,
        { ...creditCardData.nuveiVisaSuccessfull, expiration_date: '1228' },
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
      '@ENTP1-T2569 Auth: non-default saved card stays selected after returning from Billing',
      { tag: ['@auth', '@user_auth', '@vault_purchase', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK)');
        await paymentPage.clickOnPayButtonEmbedded();

        await test.step('Fill initial Billing form', async () => {
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
          await vaultWidgetPage.fillBillingForm('Nayarit', 'Tepic');
          await paymentDeunaNowPage.clickToSaveFormButton();
        });

        const defaultCard = creditCardData.nuveiMasterCardSucessfull;
        const defaultCardLastNumbers = `**** ${defaultCard.number.slice(-4)}`;
        const secondCard = creditCardData.nuveiVisaSuccessfull;
        const secondCardLastNumbers = `**** ${secondCard.number.slice(-4)}`;

        await test.step('Verify default saved card (Mastercard) is shown initially', async () => {
          await vaultWidgetPage.assertSavedCardIsVisible(defaultCardLastNumbers);
        });

        await test.step('Select the non-default card (Visa)', async () => {
          await vaultWidgetPage.buttonSeeMoreCards.click();
          await vaultWidgetPage.clickOnTestCard(secondCard.number);
          await vaultWidgetPage.fillCvvInCardForm(secondCard.cvv_code);
          await vaultWidgetPage.assertSavedCardIsVisible(secondCardLastNumbers);
        });

        await test.step('Navigate to Billing and update it', async () => {
          await vaultWidgetPage.buttonUpdateBillingData.click();
          await vaultWidgetPage.assertBillingFormTitleIsVisible();
          await vaultWidgetPage.fillBillingForm('Campeche', 'Atasta');
          await vaultWidgetPage.clickSaveBillingForm();
        });

        await test.step('BUG CHECK: Visa must stay selected — selection must NOT revert to default Mastercard', async () => {
          await vaultWidgetPage.assertNonDefaultCardRemainsSelectedAfterBilling(
            secondCardLastNumbers,
            defaultCardLastNumbers
          );
        });

        await test.step('Complete purchase with Visa and assert order status', async () => {
          await vaultWidgetPage.clickOnPay();
        });
        await test.step('Assert purchase V2 response returns processed status with correct card', async () => {
          const response = await vaultWidgetPage.assertOrderStatusRequestPurchaseV2(
            'processed',
            200
          );
          const lastFourResponse = response.order.payment.data.from_card.last_four;
          expect(lastFourResponse, 'Last four digits should match the card used for purchase').toBe(
            secondCard.number.slice(-4)
          );
        });

        await test.step('Assert transaction payment status is processed in the admin', async () => {
          await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
        });
      }
    );
  }
);
