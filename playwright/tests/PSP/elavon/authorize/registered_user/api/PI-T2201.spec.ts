import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { userAddressCreditCardUS } from '@support/interfaces/address_user';

const CARD_A = creditCardData.elavonVisaSuccessfull;
const CARD_B = creditCardData.elavonDiscoverSuccessfull;

const CARD_A_FIRST_SIX = CARD_A.number.slice(0, 6);
const CARD_A_LAST_FOUR = CARD_A.number.slice(-4);
const CARD_B_FIRST_SIX = CARD_B.number.slice(0, 6);
const CARD_B_LAST_FOUR = CARD_B.number.slice(-4);

// Brand string as Elavon's raw_purchase_authorize_request reports it — 4000-… reports
// "visa", 6011-… reports "diners" (Elavon groups Discover BINs under the Diners channel).
const CARD_A_BRAND = 'visa';
const CARD_B_BRAND = 'diners';

const GROUP_A = 'shopperA';
const GROUP_B = 'shopperB';

const PROCESSOR_NAME = processorsConfig.elavonProcessorAuthorize.name;
const ORDER_AMOUNT = 1000;

test.describe('@regression Elavon US - Concurrent saved-card detokenization', () => {
  test(
    "@PI-T2201 Concurrent VGS detokenization returns each token's own card data",
    { tag: ['@team_payment_integration', '@api'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          {
            action: 'setup.merchant.basicSetup',
            stepName: 'Create merchant in the US',
            params: { country: 'US' },
          },
          {
            action: 'setup.processor.createProcessor',
            stepName: 'Create Elavon payment processor (authorize flow)',
            params: { processorConfig: processorsConfig.elavonProcessorAuthorize },
          },

          {
            action: 'setup.user.register',
            stepName: 'Register shopper A',
            saveAs: 'shopperA',
          },
          {
            action: 'setup.user.register',
            stepName: 'Register shopper B',
            saveAs: 'shopperB',
          },

          {
            action: 'setup.user.enrollCard',
            stepName: 'Enroll Card A for shopper A',
            params: {
              creditCard: CARD_A,
              address: userAddressCreditCardUS,
              userId: ref('shopperA').at('user.user_id'),
              userToken: ref('shopperA').at('user.token'),
            },
            saveAs: 'enrolledCardA',
          },
          {
            action: 'setup.user.enrollCard',
            stepName: 'Enroll Card B for shopper B',
            params: {
              creditCard: CARD_B,
              address: userAddressCreditCardUS,
              userId: ref('shopperB').at('user.user_id'),
              userToken: ref('shopperB').at('user.token'),
            },
            saveAs: 'enrolledCardB',
          },

          {
            action: 'setup.order.createOrder',
            stepName: 'Tokenize order A1 for shopper A',
            params: { country: 'US', options: { amount: ORDER_AMOUNT } },
            saveAs: 'orderA1',
          },
          {
            action: 'setup.order.createOrder',
            stepName: 'Tokenize order B1 for shopper B',
            params: { country: 'US', options: { amount: ORDER_AMOUNT } },
            saveAs: 'orderB1',
          },
          {
            action: 'setup.order.createOrder',
            stepName: 'Tokenize order A2 for shopper A',
            params: { country: 'US', options: { amount: ORDER_AMOUNT } },
            saveAs: 'orderA2',
          },
          {
            action: 'setup.order.createOrder',
            stepName: 'Tokenize order B2 for shopper B',
            params: { country: 'US', options: { amount: ORDER_AMOUNT } },
            saveAs: 'orderB2',
          },
          {
            action: 'setup.order.createOrder',
            stepName: 'Tokenize order A3 for shopper A',
            params: { country: 'US', options: { amount: ORDER_AMOUNT } },
            saveAs: 'orderA3',
          },
          {
            action: 'setup.order.createOrder',
            stepName: 'Tokenize order B3 for shopper B',
            params: { country: 'US', options: { amount: ORDER_AMOUNT } },
            saveAs: 'orderB3',
          },

          {
            action: 'api.payment.purchaseConcurrent',
            stepName: 'Fire six saved-card purchases in parallel, alternating shoppers',
            params: {
              purchases: [
                {
                  userToken: ref('shopperA').at('user.token'),
                  cardId: ref('enrolledCardA').at('data.data.id'),
                  orderToken: ref('orderA1').at('data.token'),
                  processorName: PROCESSOR_NAME,
                },
                {
                  userToken: ref('shopperB').at('user.token'),
                  cardId: ref('enrolledCardB').at('data.data.id'),
                  orderToken: ref('orderB1').at('data.token'),
                  processorName: PROCESSOR_NAME,
                },
                {
                  userToken: ref('shopperA').at('user.token'),
                  cardId: ref('enrolledCardA').at('data.data.id'),
                  orderToken: ref('orderA2').at('data.token'),
                  processorName: PROCESSOR_NAME,
                },
                {
                  userToken: ref('shopperB').at('user.token'),
                  cardId: ref('enrolledCardB').at('data.data.id'),
                  orderToken: ref('orderB2').at('data.token'),
                  processorName: PROCESSOR_NAME,
                },
                {
                  userToken: ref('shopperA').at('user.token'),
                  cardId: ref('enrolledCardA').at('data.data.id'),
                  orderToken: ref('orderA3').at('data.token'),
                  processorName: PROCESSOR_NAME,
                },
                {
                  userToken: ref('shopperB').at('user.token'),
                  cardId: ref('enrolledCardB').at('data.data.id'),
                  orderToken: ref('orderB3').at('data.token'),
                  processorName: PROCESSOR_NAME,
                },
              ],
            },
          },

          {
            action: 'api.orders.assertPurchaseCardIntegrity',
            stepName:
              'Assert every order preserved its own card in GET Order, settlement.card_token and settlement.raw_request',
            params: {
              transactions: [
                {
                  orderToken: ref('orderA1').at('data.token'),
                  expectedFirstSix: CARD_A_FIRST_SIX,
                  expectedLastFour: CARD_A_LAST_FOUR,
                  expectedCardBrand: CARD_A_BRAND,
                  cardGroupLabel: GROUP_A,
                },
                {
                  orderToken: ref('orderB1').at('data.token'),
                  expectedFirstSix: CARD_B_FIRST_SIX,
                  expectedLastFour: CARD_B_LAST_FOUR,
                  expectedCardBrand: CARD_B_BRAND,
                  cardGroupLabel: GROUP_B,
                },
                {
                  orderToken: ref('orderA2').at('data.token'),
                  expectedFirstSix: CARD_A_FIRST_SIX,
                  expectedLastFour: CARD_A_LAST_FOUR,
                  expectedCardBrand: CARD_A_BRAND,
                  cardGroupLabel: GROUP_A,
                },
                {
                  orderToken: ref('orderB2').at('data.token'),
                  expectedFirstSix: CARD_B_FIRST_SIX,
                  expectedLastFour: CARD_B_LAST_FOUR,
                  expectedCardBrand: CARD_B_BRAND,
                  cardGroupLabel: GROUP_B,
                },
                {
                  orderToken: ref('orderA3').at('data.token'),
                  expectedFirstSix: CARD_A_FIRST_SIX,
                  expectedLastFour: CARD_A_LAST_FOUR,
                  expectedCardBrand: CARD_A_BRAND,
                  cardGroupLabel: GROUP_A,
                },
                {
                  orderToken: ref('orderB3').at('data.token'),
                  expectedFirstSix: CARD_B_FIRST_SIX,
                  expectedLastFour: CARD_B_LAST_FOUR,
                  expectedCardBrand: CARD_B_BRAND,
                  cardGroupLabel: GROUP_B,
                },
              ],
            },
          },
        ],
      });
    }
  );
});
