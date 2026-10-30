import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

/**
 * Reproduces the Flybondi incident payload field for field: a purchase that Cybersource
 * Decision Manager marks for review must come back with the antifraud analysis already
 * filled in — processor, score, risk level, decision, the review reason and the in_review
 * state — and GET Order must report the same values.
 *
 * The engine keys its decision off the order's email, not the payer email sent with the
 * purchase, which is why the review email is set on the order rather than on the payment.
 *
 * PI-T2184 covers the same regression on the PSP-side manual review (MercadoPago with
 * binary mode disabled), where the platform's default engine leaves these fields empty.
 */
const CYBERSOURCE_REVIEW_EMAIL = 'review@deuna.com';

test.describe('@regression Antifraud data in the Purchase response for manual review', () => {
  test(
    '@PI-T2197 Purchase response exposes the Cybersource analysis when the order is marked for review',
    { tag: ['@fraud', '@api', '@team_payment_integration'] },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          {
            stepName: 'Create merchant',
            action: 'setup.merchant.basicSetup',
            params: { country: 'MX' },
          },
          {
            stepName: 'Create the payment processor',
            action: 'setup.processor.createProcessor',
            params: { processorConfig: processorsConfig.stripeProcessor },
            saveAs: 'processorId',
          },
          {
            stepName: 'Configure Cybersource with manual review enabled',
            action: 'setup.fraud.configureManualReviewEngine',
            params: {
              engine: ConnectionsAvailable.cybersourceFraud,
              paymentProcessor: processorsConfig.stripeProcessor,
            },
          },
          {
            stepName: 'Tokenize an order that Decision Manager marks for review',
            action: 'setup.order.createOrder',
            params: {
              country: 'MX',
              options: { user_email: CYBERSOURCE_REVIEW_EMAIL, amount: 4990 },
            },
          },
          {
            stepName: 'Execute Purchase',
            action: 'api.payment.purchaseWithCreditCard',
            params: {
              creditCard: creditCardData.stripeVisaSuccessfulFraudAprove,
              processorName: processorsConfig.stripeProcessor.name,
            },
          },
          {
            stepName: 'Validate the purchase was accepted and left in review',
            action: 'api.payment.assertPurchaseStatus',
            params: {
              expectedStatus: 200,
              expectedBody: { order: { payment: { data: { status: 'processed' } } } },
            },
          },
          {
            stepName: 'Validate antifraud data is present in the Purchase response',
            action: 'api.payment.assertPurchaseFraudAnalysis',
            params: {
              processor: ConnectionsAvailable.cybersourceFraud,
              riskLevel: 'medium',
              fraudDecision: 'medium_risk',
              processorResponse: 'PENDING_REVIEW',
              detailsContains: 'marked for review by Decision Manager',
              fraudProcessStatus: 'in_review',
              populatedFields: ['processor', 'processor_id', 'score', 'status'],
            },
            saveAs: 'purchaseFraudAnalysis',
          },
          {
            stepName: 'Validate GET Order exposes the same antifraud data',
            action: 'api.orders.assertOrderFraudAnalysis',
            params: {
              matches: ref('purchaseFraudAnalysis'),
              fraudProcessStatus: 'in_review',
            },
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
