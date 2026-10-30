import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';

const REQUIRED_EVENTS = ['tv_initiate_three_ds_called', 'tv_continue_three_ds_called'];

/**
 * Regression cover for RIS-482 (PCI): the request payload of the 3DS Evaluation Update
 * (`tv_continue_three_ds_called`) shown in the Admin's Transaction Visibility exposed the full
 * card number (PAN) in plain text. Expected behaviour: no Transaction Visibility event carries the
 * PAN or the CVV; card fields are masked (at most BIN and last 4 digits).
 *
 * The RIS-482 ticket lists no fix reference. The Admin screen renders GET /trace/logs, so the
 * spec asserts that feed directly. The 3DS Evaluation Update is only emitted once the browser
 * finishes the 3DS device-data collection, so the purchase goes through the Payment Widget (a
 * pure API purchase stops at `pending_3ds` and never emits it). The Zephyr steps 1-9 are covered
 * for the frictionless and the challenge card. Step 10 (visual check in the Admin) is not
 * automated: it reads the same feed this spec asserts, and a PAN-in-DOM check would add a
 * brittle Admin flow for no extra detection.
 */
test.describe('@regression Cybersource 3DS - Transaction Visibility card masking', () => {
  test(
    '@PI-T2206 3DS Transaction Visibility events never expose full card PAN',
    { tag: ['@team_payment_integration'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          { action: 'setup.merchant.basicSetup', params: { country: 'PE' } },
          {
            action: 'setup.processor.createProcessor',
            params: { processorConfig: processorsConfig.cybersourceProcessor_PE_Deuna3DS },
            saveAs: 'processorId',
          },
          { action: 'setup.order.createOrder', params: { country: 'PE' } },
          {
            action: 'checkout.openCheckout',
            params: { experienceType: 'Payment Widget' },
            stepName: 'The user opens the Payment Widget',
          },
          {
            action: 'checkout.paymentWidget.fillCreditCardData',
            params: {
              creditCardData: creditCardData.cybersource3dsVisaFrictionless,
              opts: { country: 'PE' },
            },
            stepName: 'The user fills the 3DS frictionless card',
          },
          {
            action: 'checkout.paymentWidget.clickOnPayButton',
            params: { withResponse: false },
            stepName: 'The user pays',
          },
          {
            action: 'api.orders.getTransactionVisibility',
            saveAs: 'frictionlessEvents',
            stepName: 'Transaction Visibility holds the 3DS Evaluation Update',
          },
          {
            action: 'api.orders.assertTransactionVisibilityMasksCard',
            params: {
              events: ref('frictionlessEvents'),
              pan: creditCardData.cybersource3dsVisaFrictionless.number,
              requiredEvents: REQUIRED_EVENTS,
            },
            stepName: 'No frictionless event exposes the card',
          },
          {
            action: 'setup.order.createOrder',
            params: { country: 'PE' },
            stepName: 'A new order is created for the challenge flow',
          },
          {
            action: 'checkout.openCheckout',
            params: { experienceType: 'Payment Widget' },
            stepName: 'The user opens the Payment Widget for the new order',
          },
          {
            action: 'checkout.paymentWidget.fillCreditCardData',
            params: {
              creditCardData: creditCardData.cybersource3dsVisaChallenge,
              opts: { country: 'PE' },
            },
            stepName: 'The user fills the 3DS challenge card',
          },
          {
            action: 'checkout.paymentWidget.clickOnPayButton',
            params: { withResponse: false },
            stepName: 'The user pays',
          },
          {
            action: 'checkout.3ds.completeChallengeCybersourcePopup',
            stepName: 'The user completes the 3DS challenge',
          },
          {
            action: 'api.orders.getTransactionVisibility',
            saveAs: 'challengeEvents',
            stepName: 'Transaction Visibility holds the 3DS Evaluation Update',
          },
          {
            action: 'api.orders.assertTransactionVisibilityMasksCard',
            params: {
              events: ref('challengeEvents'),
              pan: creditCardData.cybersource3dsVisaChallenge.number,
              requiredEvents: REQUIRED_EVENTS,
            },
            stepName: 'No challenge event exposes the card',
          },
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
