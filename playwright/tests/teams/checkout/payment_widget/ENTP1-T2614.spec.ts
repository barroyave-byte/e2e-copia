import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { TestingFramework } from 'playwright/framework/core';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { randomUUID } from 'crypto';
import { fullWidgetGuestCustomStyle } from '@support/mocks/customStyles/fullWidgetGuest';
import { EmailGenerator } from '@support/utils/EmailGenerator';

// Assertions in this flow must fail fast: once the billing form is rendered
// there is no pending async work, so a border color is either already correct
// or already wrong — no legitimate reason to poll for the global 40s
// (playwright.config.ts `expect.timeout`) before failing.
const FAST_TIMEOUT_MS = 1000;

// ── ENTP1-T2614 — E2E/QA coverage map ────────────────────────────────────────
// 1. Render the billing form in a config equivalent to Volaris SBX:
//    the setup steps below (inputMode: 'validated', BillingPattern with
//    Country, State and City all in their Dropdown configuration).
// 2. Country dropdown preselected: 'Bug repro' step — the dropdown is never
//    touched before the assertion, the country arrives preselected from the
//    merchant config (CO).
// 3. Correct application of validated mode: same assertion — fails if the
//    border isn't `colors.inputBorderPositive`.
// 4. Manually changing the country and updating the state: 'Acceptance
//    criteria...' step — selects Mexico and asserts the green border again.
// 5. Visual consistency between dropdowns and inputs: 'Consistency check'
//    step — compares Country/State/City's borders directly against an
//    already-validated input (Address/address1), all must resolve to the
//    same color.
// 6. Respecting merchant customizations: every assertion uses
//    `fullWidgetGuestCustomStyle.theme.colors.inputBorderPositive` (a custom
//    color from the mock, not the design system default) — if the
//    implementation ignored the merchant's customization, the assertion
//    would fail.
// 7. Desktop and mobile validation: not covered by this file at the moment —
//    only the desktop `@ENTP1-T2614` test runs.
//
// This E2E fails if: the country has a valid value and doesn't show the
// validated state, the state doesn't update when the country changes, the
// dropdown doesn't take a green border, or there's a visual inconsistency
// between validated inputs and dropdowns.

// BillingPattern with Country, State and City as dropdowns (plus Address, for
// the consistency comparison) — the setup where ENTP1-18066 was reported
// (Volaris SBX): Country arrives preselected with a valid value but never
// reaches the "validated" visual state (green border) that the rest of the
// inputs reach under the same theme.
const checkout_modules = [
  {
    name: 'BillingPattern',
    props: {
      // `fields` is a whitelist — BillingPattern only renders the fields
      // listed here (mergeCustomFields in modular-checkout's
      // configurableFields.tsx filters the full field set down to this
      // list), so Country/State/City must be listed explicitly or they don't
      // render at all. Shape matches CheckoutModuleField (name + validation
      // only — no `field_type`, that's a frontend-only prop the config API
      // doesn't accept); same shape already proven in ENTP1-T2306.
      fields: [
        {
          name: 'address1',
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

const widgetGeneralsConfig = {
  ...widgetsGeneralConfig,
  checkout_modules,
  user_experience: {
    show_saved_cards_flow: true,
  },
};

const elementsConfig = {
  ...newElementsConfig,
  // fullWidgetGuestCustomStyle sets theme.inputs.inputMode = 'validated' and
  // custom colors (inputBorderPositive/inputBorderError) — same mock already
  // proven against this merchant in ENTP1-T2600 (validated/error borders on
  // card fields).
  theme_config: [
    {
      id: randomUUID(),
      name: 'new_theme_config',
      config: JSON.stringify(fullWidgetGuestCustomStyle),
    },
  ],
};

const amount = 190000;
const { colors } = fullWidgetGuestCustomStyle.theme;

test.describe(
  '@regression Display validated mode when country-city-state inputs are properly selected',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    test(
      '@ENTP1-T2614 Display validated mode when country-city-state inputs are properly selected',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            { action: 'setup.merchant.basicSetup', params: { country: 'CO' } },
            {
              action: 'setup.checkout.configureV2',
              params: { widgetGeneralsConfig, elementsConfig },
            },
            // Just enough infra for the card tab + card form to render — no
            // installments/MSI campaign, no purchase: out of scope for ENTP1-18066.
            {
              action: 'setup.processor.createProcessor',
              params: { processorConfig: processorsConfig.globalpayProcessor },
            },
            {
              action: 'setup.order.createOrder',
              params: {
                country: 'CO',
                options: {
                  user_email: EmailGenerator.generateRegisteredUserEmail(),
                  amount,
                },
              },
            },
            { action: 'checkout.openCheckout', params: { experienceType: 'Payment Widget' } },
            {
              action: 'checkout.paymentWidget.fillCreditCardData',
              params: {
                creditCardData: creditCardData.globalpayVisaSuccessful,
                opts: { country: 'CO' },
              },
              stepName: 'Fill card data to reach the billing section',
            },
            {
              action: 'checkout.paymentWidget.showBillingForm',
              stepName:
                'Open billing form and fill address1 (only field this test needs besides Country)',
            },
            {
              action: 'checkout.paymentWidget.fillBillingAddress1',
              params: { value: 'Calle 123' },
            },
            {
              action: 'checkout.paymentWidget.assertBillingDropdownBorderColor',
              params: {
                field: 'country',
                expectedHex: colors.inputBorderPositive,
                timeout: FAST_TIMEOUT_MS,
              },
              stepName:
                'Bug repro: Country comes preselected with a valid value but must NOT stay in the neutral/"selected" ' +
                'border — it must resolve to the validated (green, inputBorderPositive) state, same as every other validated field on this form',
            },
            {
              action: 'checkout.paymentWidget.selectBillingDropdownOption',
              params: { field: 'state', timeout: FAST_TIMEOUT_MS },
              stepName: 'Select State (starts empty, unlike the preselected Country)',
            },
            {
              action: 'checkout.paymentWidget.selectBillingDropdownOption',
              params: { field: 'city', timeout: FAST_TIMEOUT_MS },
              stepName: 'Select City (starts empty, unlike the preselected Country)',
            },
            {
              action: 'checkout.paymentWidget.assertAddress1BorderColor',
              params: { expectedHex: colors.inputBorderPositive, timeout: FAST_TIMEOUT_MS },
              stepName:
                'Consistency check: Country, State, City (dropdowns) and Address (input) are all in the validated ' +
                'state — they must all resolve to the exact same border color, no visual inconsistency between inputs and dropdowns',
            },
            {
              action: 'checkout.paymentWidget.assertBillingDropdownBorderColor',
              params: {
                field: 'country',
                expectedHex: colors.inputBorderPositive,
                timeout: FAST_TIMEOUT_MS,
              },
            },
            {
              action: 'checkout.paymentWidget.assertBillingDropdownBorderColor',
              params: {
                field: 'state',
                expectedHex: colors.inputBorderPositive,
                timeout: FAST_TIMEOUT_MS,
              },
            },
            {
              action: 'checkout.paymentWidget.assertBillingDropdownBorderColor',
              params: {
                field: 'city',
                expectedHex: colors.inputBorderPositive,
                timeout: FAST_TIMEOUT_MS,
              },
            },
            // Runs last on purpose: State/City above are Colombia-specific,
            // and switching Country away from Colombia resets them.
            {
              action: 'checkout.paymentWidget.selectBillingDropdownOption',
              params: { field: 'country', timeout: FAST_TIMEOUT_MS },
              stepName:
                'Acceptance criteria: changing Country to another valid option must update and keep the validated (green) border',
            },
            {
              action: 'checkout.paymentWidget.assertBillingDropdownBorderColor',
              params: {
                field: 'country',
                expectedHex: colors.inputBorderPositive,
                timeout: FAST_TIMEOUT_MS,
              },
            },
          ],
        });
      }
    );
  }
);
