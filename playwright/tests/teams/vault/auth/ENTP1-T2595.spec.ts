/**
 * ENTP1-T2595 — Regression test: BUGS-211 (Airline Order)
 *
 * Validates the split payment flow for an authenticated user with ZERO saved
 * cards: the user activates split payment first, fills a new card in the
 * split view, then saves the billing form. The card data entered by the user
 * must persist after the billing save.
 *
 * Companion to T2586 (authenticated with saved card) and T2587 (guest).
 *
 * Order: AIRLINE_ORDER · MXN · 389 100 minor units ($3 891.00 MXN)
 *
 * This test FAILS if:
 * - The card form fields are empty after saving the billing form
 * - A saved-card container appears for a user that has no saved cards
 * - The split payment flow does not complete through to the summary
 */

import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
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

// Card the user manually enters as the first slot in split payment (Mastercard CO)
const newCard1 = creditCardData.mercadopagoMasterCardSuccessfulCO;

// Card for the second slot (Mastercard)
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
  '@regression Split Payment - Authenticated user with ZERO saved cards keeps new card data after saving billing form (BUGS-211 - Airline Order)',
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

      // Register the user WITHOUT seeding any saved card (BUGS-211
      // precondition: authenticated user, zero saved cards).
      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: newCard1.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
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
      '@ENTP1-T2595 Split Payment - Authenticated user with ZERO saved cards keeps new card data after saving billing form (BUGS-211 - Airline Order)',
      { tag: ['@split_payment', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK)');
        await paymentPage.clickOnPayButtonEmbedded();

        await test.step('Verify NO saved card is shown on initial vault load (user has zero saved cards)', async () => {
          await vaultWidgetPage.assertNewCardFormShownWithoutSavedCards();
        });

        await test.step('Enter split payment flow FIRST (before typing any card)', async () => {
          await vaultWidgetPage.clickPayWithTwoCards();
          await vaultWidgetPage.assertSplitPaymentFormIsVisible();
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

        await test.step('[BUGS-211 regression] Card data entered by the user must PERSIST after saving the billing form', async () => {
          await vaultWidgetPage.assertCardFormValuesPersisted(newCard1);
        });

        await test.step('Adjust amount for first card', async () => {
          await vaultWidgetPage.adjustAmountForCard1(amountCard1);
        });

        await test.step('Continue to second card step', async () => {
          await vaultWidgetPage.clickContinueWithCard2();
          await vaultWidgetPage.assertAdvancedToSecondSplitStep();
        });

        await test.step('Fill new card form for second slot (Mastercard)', async () => {
          await vaultWidgetPage.fillCardForm(newCard2, {
            country: 'MX',
            avoidInstallmentsCall: true,
          });
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
