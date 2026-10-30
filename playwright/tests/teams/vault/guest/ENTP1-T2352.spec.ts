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
      ],
      show_in_main_view: false,
    },
  },
];
const amountCard1 = '2000';
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

test.describe(
  '@regression Flujo Split Payments -  Usuario autenticado compra con cuotas de pago correctas asociadas al monto dividido',
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
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mercadoPagoProcessor,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
        user_email: userEmail,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createCampaignMSI('COP', merchantId, merchantToken);
      // Register user and set address
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
        creditCardData.mercadoPagoVisaCardSuccessful,
        userAddressCreditCard.userAddressCreditCardCO,
        merchantId,
        privateKey
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.mercadoPagoVisaCardTokenizationSuccessful,
        userAddressCreditCard.userAddressCreditCardCO,
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
      '@ENTP1-T2352 Flujo Split Payments Autenticado - Cuotas solo para la tarjeta 1 si la tarjeta 2 no califica',
      { tag: ['@split_payment', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        await paymentPage.clickOnPayButtonEmbedded();
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Fill Billing form', async () => {
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
          await vaultWidgetPage.fillBillingForm('Bogotá D.C.', 'Bogotá D.C.');
          await paymentDeunaNowPage.clickToSaveFormButton();
        });

        await test.step('User sees correct installments in Single Payment flow', async () => {
          await vaultWidgetPage.fillCvvInCardForm(
            creditCardData.mercadoPagoVisaCardSuccessful.cvv_code,
            'fill',
            true
          );
        });
        await test.step('User goes to Split Payments and Installments are recalculated', async () => {
          await vaultWidgetPage.clickPayWithTwoCards();
        });

        await test.step('User adjust amount for card 1', async () => {
          await vaultWidgetPage.adjustCardAmount(1, amountCard1);
          await vaultWidgetPage.assertInstallmentsFieldVisible();
        });
        await test.step('User select MSI', async () => {
          await vaultWidgetPage.selectInstallmentsMSI('3');
        });

        await test.step('The user does not see installments on the second card due to the amount', async () => {
          const expectedSecondBin = creditCardData.mercadoPagoVisaCardTokenizationSuccessful.number
            .slice(0, 6)
            .toString();
          // wait for performAutoSelection installments fetch to complete
          // before filling CVV. Same race condition as ENTP1-T2304 — isAutoSelectingRef=true
          // blocks useSelectedCardIdSync while the fetch is in-flight, discarding the CVV.
          vaultWidgetPage.waitForInstallmentsResponse(expectedSecondBin);
          await vaultWidgetPage.clickContinueWithCard2();
          await vaultWidgetPage.assertInstallmentsData(3, undefined, undefined);

          await vaultWidgetPage.fillCvvInCardForm(
            creditCardData.mercadoPagoVisaCardSuccessful.cvv_code,
            'fill',
            true
          );
        });

        await test.step('Verify order information', async () => {
          await vaultWidgetPage.clickContinueWithThePaymentSummary();
          await vaultWidgetPage.assertSummaryTitle();
        });

        await test.step('Verify installments dropdown is visible and the second one is hidden', async () => {
          await vaultWidgetPage.assertInstallmentsFieldsByCardIndexIsVisible(0);
          await vaultWidgetPage.assertInstallmentsFieldsByCardIndexIsHidden(1);
        });

        await test.step('User clicks on pay and validate vaultSaveSuccess metadata', async () => {
          const metadataPromise = vaultWidgetPage.assertEventMetadata('vaultSaveSuccess');
          await paymentPage.clickOnPayButtonSummaryWithOutTransaction();
          const metadata = await metadataPromise;

          vaultWidgetPage.assertVaultSaveSuccessCards(metadata, [
            {
              firstSix: creditCardData.mercadoPagoVisaCardSuccessful.number.slice(0, 6),
              lastFour: creditCardData.mercadoPagoVisaCardSuccessful.number.slice(-4),
              storedCard: true,
              installmentsCount: 3,
              billingCity: 'Bogotá D.C.',
              billingStateName: 'Bogotá D.C.',
            },
            {
              firstSix: creditCardData.mercadoPagoVisaCardTokenizationSuccessful.number.slice(0, 6),
              lastFour: creditCardData.mercadoPagoVisaCardTokenizationSuccessful.number.slice(-4),
              storedCard: true,
              billingCity: 'Bogotá D.C.',
              billingStateName: 'Bogotá D.C.',
            },
          ]);
        });
      }
    );
  }
);
