/**
 * ENTP1-T2586 — Regression test: Bug 1 (Airline Order)
 *
 * Validates the full split payment flow when an authenticated user with a saved
 * default card switches the first slot to a NEW card and then enables split payment.
 * The saved default card must NOT replace the new card form at any point.
 *
 * Bug 1 root cause: `selectedCard` was stale in CardContext (the saved card
 * persisted even after the user switched to "add new card"), causing
 * `initializeSplitPaymentCards` to assign `methodType = UserCard` to slot 0
 * despite the active method being CreditCard.
 *
 * Order: AIRLINE_ORDER · MXN · 389 100 minor units ($3 891.00 MXN)
 *
 * This test FAILS if:
 * - The first card reverts to the saved default card after "Agregar una tarjeta"
 * - The saved card replaces the new card form entered by the user
 * - The summary does not show the correct brand for the first card
 * - The second slot does not pre-select the saved default card
 * - The total amount is charged to a single card
 */

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
import * as crypto from 'crypto';
import { EmailGenerator } from '@support/utils/EmailGenerator';

// ─── Constants ─────────────────────────────────────────────────────────────

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();

const userEmail = EmailGenerator.generateRegisteredUserEmail();

// Default saved card (VISA) seeded for the authenticated user
const savedCard = creditCardData.mercadoPagoVisaCardSuccessful;
const savedCardLastFour = savedCard.number.slice(-4);

// Card the user manually enters as the first slot in split payment (Mastercard)
const newCard1 = creditCardData.mercadopagoMasterCardSuccessfulCO;

// Card for the second slot (different Mastercard)
const newCard2 = creditCardData.mercadopagoMasterCardSuccessful;

// Amount entered for card 1 in MXN display format (100 000 minor units)
const amountCard1 = '1000.00';

// Total order amount in minor units ($3 891.00 MXN)
const TOTAL_ORDER_AMOUNT = 389100;

// ─── Widget Config ──────────────────────────────────────────────────────────

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
};

// ─── Order Payload Builder ──────────────────────────────────────────────────

/**
 * Builds the AIRLINE_ORDER payload for this test.
 * A new order_id is generated on each call so that parallel test runs
 * don't collide on the same order token.
 */
const buildOrderPayload = () => ({
  order_type: 'AIRLINE_ORDER',
  order: {
    currency: 'MXN',
    payer_info: {
      email: userEmail,
    },
    billing_address: {
      country_code: 'MX',
      email: userEmail,
    },
    order_id: crypto.randomUUID(),
    sub_total: TOTAL_ORDER_AMOUNT,
    total_amount: TOTAL_ORDER_AMOUNT,
    total_tax_amount: 0,
    store_code: 'all',
    airline_information: {},
  },
});

// ─── Test Suite ─────────────────────────────────────────────────────────────

test.describe(
  '@regression Split Payment - Authenticated user switches to new card before enabling split payment; saved default card must not replace new card form (Bug 1 - Airline Order)',
  { tag: ['@checkout', '@elements_link', '@team_enterprise'] },
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
      await apiCallNewman.configureSplitPaymentWithClickToPay(merchantId, merchantToken, {
        widgetGeneralConfig: generalWidgetConfig.widgets_general_config,
      });

      // Register user and seed the default saved card (VISA)
      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
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
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);

      // Tokenize the airline order for this user
      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, buildOrderPayload()))
        .data.token;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.nuveiProcessor,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach('Open the testing page with Split Payment enabled', async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Formularios', true, true);
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        withSplitPayment: true,
        userToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    });

    test(
      '@ENTP1-T2586 Split Payment - Authenticated user switches to new card before enabling split payment; saved default card must not replace new card form (Bug 1 - Airline Order)',
      { tag: ['@smoke', '@split_payment', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK)');
        await paymentPage.clickOnPayButtonEmbedded();

        await test.step('Verify default saved card is shown on initial vault load', async () => {
          await vaultWidgetPage.assertSelectedCardIsPreselected();
          await vaultWidgetPage.assertSavedCardIsVisible(`**** ${savedCardLastFour}`);
        });

        await test.step('Switch first slot to a new card — user abandons the saved card', async () => {
          await vaultWidgetPage.addNewCard();
        });

        await test.step('Enter split payment flow', async () => {
          await vaultWidgetPage.clickPayWithTwoCards();
          await vaultWidgetPage.assertSplitPaymentFormIsVisible();
        });

        await test.step('[Bug 1 regression] Saved default card must NOT replace the new card form after switching to "Agregar una tarjeta"', async () => {
          await vaultWidgetPage.assertNewCardFormIsActive();
        });

        await test.step('Fill new card form for first slot (Mastercard CO)', async () => {
          await vaultWidgetPage.fillCardForm(newCard1, {
            country: 'MX',
            avoidInstallmentsCall: true,
          });
        });

        await test.step('Fill billing form for the new card in split payment', async () => {
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
          await vaultWidgetPage.fillBillingForm('Nayarit', 'Tepic');
          await paymentDeunaNowPage.clickToSaveFormButton();
        });

        await test.step('Adjust amount for first card', async () => {
          await vaultWidgetPage.adjustAmountForCard1(amountCard1);
        });

        await test.step('Continue to second card step', async () => {
          await vaultWidgetPage.clickContinueWithCard2();
          await vaultWidgetPage.assertAdvancedToSecondSplitStep();
        });

        await test.step('Verify saved default card is pre-selected in split step 2 and fill its CVV', async () => {
          await vaultWidgetPage.assertSelectedCardIsPreselected();
          await vaultWidgetPage.assertSavedCardIsVisible(`**** ${savedCardLastFour}`);
          await vaultWidgetPage.fillCvvInCardForm(savedCard.cvv_code, 'press', true);
        });

        await test.step('Continue to payment summary', async () => {
          await vaultWidgetPage.clickContinueWithThePaymentSummary();
          await vaultWidgetPage.assertSummaryTitle();
        });

        await test.step('Validate first card brand is correctly shown in the split payment summary', async () => {
          await vaultWidgetPage.assertFirstSplitSummaryCardBrand();
        });

        await test.step('Confirm payment by clicking save cards', async () => {
          await vaultWidgetPage.clickOnSaveCards();
        });
      }
    );
  }
);
