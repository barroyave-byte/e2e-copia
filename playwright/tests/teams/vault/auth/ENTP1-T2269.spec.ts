import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutModulesForWidgetConfig } from '@support/interfaces/CheckoutConfigurationV2';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
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
        {
          name: 'phone',
          validation: {
            required: true,
          },
        },
        {
          name: 'country',
          validation: {
            required: true,
          },
        },
        {
          name: 'identity_document',
          validation: {
            required: true,
          },
        },
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
    ...newElementsConfig,
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};
const amountCard1 = '1000.00';
const phoneNumber = '5939861003';

test.describe(
  '@regression Flujo Split Payments -  Usuario Autenticado con 2 o más tarjetas guardadas ',
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
        processorsConfig.mercadoPagoProcessor,
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
        creditCardData.mercadopagoMasterCardSuccessfulCO,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      // Saved cards are listed by expiration_date and both cards expire on 11/27: with the tie,
      // either card could come first, while vaultSaveSuccess is asserted Mastercard first. A
      // later expiration keeps the Mastercard first.
      await apiCallNewman.setCreditCardForUser(
        userEmail,
        { ...creditCardData.mercadoPagoVisaCardSuccessful, expiration_date: '1228' },
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
          withSplitPayment: true,
          userToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2269 Flujo Split Payments - Usuario Autenticado con 1 tarjeta guardada',
      {
        tag: [
          '@smoke',
          '@split_payment',
          '@payments_integration',
          '@team_enterprise',
          '@preprod',
          '@checkout_ui',
        ],
      },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        await paymentPage.clickOnPayButtonEmbedded();
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        const mastercardLastFour =
          creditCardData.mercadopagoMasterCardSuccessfulCO.number.slice(-4);
        const visaLastFour = creditCardData.mercadoPagoVisaCardSuccessful.number.slice(-4);

        await test.step('Fill Billing form', async () => {
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
          await vaultWidgetPage.fillBillingFormWithCountry('Nayarit', 'Tepic', phoneNumber);
          await paymentDeunaNowPage.clickToSaveFormButton();
        });

        await test.step('User fills first card cvv and adjust amount', async () => {
          await vaultWidgetPage.clickPayWithTwoCards();
          await vaultWidgetPage.fillCvvInCardForm(
            creditCardData.mercadoPagoVisaCardSuccessful.cvv_code,
            'fill',
            true
          );
          await vaultWidgetPage.adjustAmountForCard1(amountCard1);
        });

        await test.step('Verify saved cards are visible', async () => {
          await vaultWidgetPage.clickContinueWithCard2();
          await vaultWidgetPage.assertSelectedCardMatchesOneOf([
            { lastFour: mastercardLastFour, brand: 'mastercard' },
            { lastFour: visaLastFour, brand: 'visa' },
          ]);
        });

        await test.step('User fills second card cvv', async () => {
          await vaultWidgetPage.fillCvvInCardForm(
            creditCardData.mercadoPagoVisaCardSuccessful.cvv_code,
            'fill',
            true
          );
        });

        await test.step('User selects Pay and validate vaultSaveSuccess metadata', async () => {
          const metadataPromise = vaultWidgetPage.assertEventMetadata('vaultSaveSuccess');
          await paymentPage.clickOnPayButtonSummaryWithOutTransaction();
          const metadata = await metadataPromise;

          vaultWidgetPage.assertVaultSaveSuccessCards(metadata, [
            {
              firstSix: creditCardData.mercadopagoMasterCardSuccessfulCO.number.slice(0, 6),
              lastFour: creditCardData.mercadopagoMasterCardSuccessfulCO.number.slice(-4),
              storedCard: true,
              billingCountry: 'MX',
              billingCity: 'Tepic',
              billingStateName: 'Nayarit',
              billingHasPhone: true,
            },
            {
              firstSix: creditCardData.mercadoPagoVisaCardSuccessful.number.slice(0, 6),
              lastFour: creditCardData.mercadoPagoVisaCardSuccessful.number.slice(-4),
              storedCard: true,
              billingCountry: 'MX',
              billingCity: 'Tepic',
              billingStateName: 'Nayarit',
            },
          ]);
        });
      }
    );
  }
);
