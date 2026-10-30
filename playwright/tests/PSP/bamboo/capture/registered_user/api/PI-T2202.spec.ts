import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { userAddressCreditCardPE } from '@support/interfaces/address_user';
import { captureSuccess } from '@support/interfaces/capture';
import { orderForBambooPeru } from '@support/interfaces/orders';
import { SavedCardBambooCapture } from '@tests/PSP/bamboo/capture/share/savedCardBambooCapture';

const CARD = creditCardData.bambooVisaSuccessfull;
const CVV = CARD.cvv_code;
const PROCESSOR_NAME = processorsConfig.bambooAuthorizeProcessorPE.name;

test.describe('@regression Bamboo PE - Saved-card authorization and capture', () => {
  test(
    '@PI-T2202 Bamboo capture payload always includes CVV in CardData',
    { tag: ['@team_payment_integration', '@api'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          {
            action: 'setup.merchant.basicSetup',
            stepName: 'Create merchant in PE',
            params: { country: 'PE' },
            saveAs: 'merchant',
          },
          {
            action: 'setup.processor.createProcessor',
            stepName: 'Create Bamboo payment processor with manual capture',
            params: { processorConfig: processorsConfig.bambooAuthorizeProcessorPE },
            saveAs: 'processorId',
          },
          {
            action: 'setup.user.register',
            stepName: 'Create user',
            saveAs: 'shopper',
          },
          {
            action: 'setup.user.enrollCard',
            stepName: 'Enroll a card with a valid CVV',
            params: {
              creditCard: CARD,
              address: userAddressCreditCardPE,
              userId: ref('shopper').at('user.user_id'),
              userToken: ref('shopper').at('user.token'),
            },
            saveAs: 'card',
          },
          {
            action: 'setup.order.tokenizeOrder',
            stepName: 'Tokenize an order',
            params: { orderData: orderForBambooPeru() },
            saveAs: 'order',
          },
          {
            action: 'api.payment.purchaseWithSavedCard',
            stepName: 'Authorize the order with the saved card, re-entering its CVV',
            // expectError so a decline reaches the assertion below as a status diff.
            params: {
              userToken: ref('shopper').at('user.token'),
              cardId: ref('card').at('data.data.id'),
              cardCvv: CVV,
              processorName: PROCESSOR_NAME,
              orderToken: ref('order').at('data.token'),
              expectError: true,
            },
          },
          {
            action: 'api.payment.assertPurchaseStatus',
            stepName: 'The order reaches authorized status (pre-capture)',
            params: {
              expectedStatus: 200,
              expectedBody: { order: { payment: { data: { status: 'authorized' } } } },
            },
          },
          {
            action: 'api.orders.captureViaAPI',
            stepName: 'Trigger the capture',
            params: { validation: captureSuccess, orderToken: ref('order').at('data.token') },
          },
          {
            action: 'api.orders.getProcessorTransactions',
            stepName: 'Read the requests sent to Bamboo',
            params: {
              orderToken: ref('order').at('data.token'),
              untilTypes: ['authorize', 'capture'],
            },
            saveAs: 'operations',
          },
          {
            action: 'api.orders.assertBambooCardData',
            stepName:
              'CardData carries a non-blank CVV, CardHolderName, Email, Expiration and Pan, and Bamboo captured the order',
            params: {
              transactions: ref('operations'),
              expectedOperations: [
                { type: 'authorize', status: 'authorized' },
                { type: 'capture', status: 'captured' },
              ],
            },
          },

          ...new SavedCardBambooCapture({
            order: 'sameCard1',
            shopper: 'shopper',
            card: 'card',
            cvv: CVV,
            merchant: 'merchant',
          }).flowSteps(),
          ...new SavedCardBambooCapture({
            order: 'sameCard2',
            shopper: 'shopper',
            card: 'card',
            cvv: CVV,
            merchant: 'merchant',
          }).flowSteps(),
          ...new SavedCardBambooCapture({
            order: 'sameCard3',
            shopper: 'shopper',
            card: 'card',
            cvv: CVV,
            merchant: 'merchant',
          }).flowSteps(),
          ...new SavedCardBambooCapture({
            order: 'sameCard4',
            shopper: 'shopper',
            card: 'card',
            cvv: CVV,
            merchant: 'merchant',
          }).flowSteps(),
          ...new SavedCardBambooCapture({
            order: 'sameCard5',
            shopper: 'shopper',
            card: 'card',
            cvv: CVV,
            merchant: 'merchant',
          }).flowSteps(),

          {
            action: 'setup.user.register',
            stepName: 'Create user 1 for a newly enrolled card',
            saveAs: 'newShopper1',
          },
          {
            action: 'setup.user.enrollCard',
            stepName: 'Enroll newly enrolled card 1',
            params: {
              creditCard: CARD,
              address: userAddressCreditCardPE,
              userId: ref('newShopper1').at('user.user_id'),
              userToken: ref('newShopper1').at('user.token'),
            },
            saveAs: 'newShopperCard1',
          },
          ...new SavedCardBambooCapture({
            order: 'newCard1',
            shopper: 'newShopper1',
            card: 'newShopperCard1',
            cvv: CVV,
            merchant: 'merchant',
          }).flowSteps(),

          {
            action: 'setup.user.register',
            stepName: 'Create user 2 for a newly enrolled card',
            saveAs: 'newShopper2',
          },
          {
            action: 'setup.user.enrollCard',
            stepName: 'Enroll newly enrolled card 2',
            params: {
              creditCard: CARD,
              address: userAddressCreditCardPE,
              userId: ref('newShopper2').at('user.user_id'),
              userToken: ref('newShopper2').at('user.token'),
            },
            saveAs: 'newShopperCard2',
          },
          ...new SavedCardBambooCapture({
            order: 'newCard2',
            shopper: 'newShopper2',
            card: 'newShopperCard2',
            cvv: CVV,
            merchant: 'merchant',
          }).flowSteps(),

          {
            action: 'setup.user.register',
            stepName: 'Create user 3 for a newly enrolled card',
            saveAs: 'newShopper3',
          },
          {
            action: 'setup.user.enrollCard',
            stepName: 'Enroll newly enrolled card 3',
            params: {
              creditCard: CARD,
              address: userAddressCreditCardPE,
              userId: ref('newShopper3').at('user.user_id'),
              userToken: ref('newShopper3').at('user.token'),
            },
            saveAs: 'newShopperCard3',
          },
          ...new SavedCardBambooCapture({
            order: 'newCard3',
            shopper: 'newShopper3',
            card: 'newShopperCard3',
            cvv: CVV,
            merchant: 'merchant',
          }).flowSteps(),

          {
            action: 'setup.user.register',
            stepName: 'Create user 4 for a newly enrolled card',
            saveAs: 'newShopper4',
          },
          {
            action: 'setup.user.enrollCard',
            stepName: 'Enroll newly enrolled card 4',
            params: {
              creditCard: CARD,
              address: userAddressCreditCardPE,
              userId: ref('newShopper4').at('user.user_id'),
              userToken: ref('newShopper4').at('user.token'),
            },
            saveAs: 'newShopperCard4',
          },
          ...new SavedCardBambooCapture({
            order: 'newCard4',
            shopper: 'newShopper4',
            card: 'newShopperCard4',
            cvv: CVV,
            merchant: 'merchant',
          }).flowSteps(),

          {
            action: 'setup.user.register',
            stepName: 'Create user 5 for a newly enrolled card',
            saveAs: 'newShopper5',
          },
          {
            action: 'setup.user.enrollCard',
            stepName: 'Enroll newly enrolled card 5',
            params: {
              creditCard: CARD,
              address: userAddressCreditCardPE,
              userId: ref('newShopper5').at('user.user_id'),
              userToken: ref('newShopper5').at('user.token'),
            },
            saveAs: 'newShopperCard5',
          },
          ...new SavedCardBambooCapture({
            order: 'newCard5',
            shopper: 'newShopper5',
            card: 'newShopperCard5',
            cvv: CVV,
            merchant: 'merchant',
          }).flowSteps(),
        ],
        cleanup: [
          {
            action: 'setup.processor.deleteProcessor',
            params: { processorId: ref('processorId') },
          },
        ],
      });
    }
  );
});
