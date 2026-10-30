import { FlowSteps, ref } from 'playwright/framework/core';
import { captureSuccess } from '@support/interfaces/capture';
import { orderForBambooPeru } from '@support/interfaces/orders';
import * as processorsConfig from '@support/interfaces/payment_processors';

const PROCESSOR_NAME = processorsConfig.bambooAuthorizeProcessorPE.name;

export interface SavedCardBambooCaptureConfig {
  /** Prefix for the step names and the step-store keys of this order. */
  order: string;
  /** Step-store key of the `setup.user.register` response of the card owner. */
  shopper: string;
  /** Step-store key of the `setup.user.enrollCard` response of the card. */
  card: string;
  /** CVV the shopper re-enters at checkout. */
  cvv: string;
  /** Step-store key of the `setup.merchant.basicSetup` result. */
  merchant: string;
}

/**
 * One PE order paid through Bamboo with manual capture: tokenize it, authorize it with the
 * shopper's saved card re-entering the CVV, capture it, and assert the CardData sent to Bamboo.
 */
export class SavedCardBambooCapture {
  constructor(private readonly config: SavedCardBambooCaptureConfig) {}

  flowSteps(): FlowSteps {
    const { order, shopper, card, cvv, merchant } = this.config;
    const orderKey = `${order}Order`;
    const operationsKey = `${order}Operations`;
    const privateKey = ref(merchant).at('privateKey');
    const orderToken = ref(orderKey).at('data.token');

    return [
      {
        action: 'setup.order.tokenizeOrder',
        stepName: `[${order}] Tokenize a PE order`,
        params: { orderData: orderForBambooPeru(), privateKey },
        saveAs: orderKey,
      },
      {
        action: 'api.payment.purchaseWithSavedCard',
        stepName: `[${order}] Authorize with the saved card, re-entering its CVV`,
        // expectError so a decline reaches the assertion below as a status diff.
        params: {
          userToken: ref(shopper).at('user.token'),
          cardId: ref(card).at('data.data.id'),
          cardCvv: cvv,
          processorName: PROCESSOR_NAME,
          orderToken,
          privateKey,
          expectError: true,
        },
      },
      {
        action: 'api.payment.assertPurchaseStatus',
        stepName: `[${order}] The order reaches authorized status`,
        params: {
          expectedStatus: 200,
          expectedBody: { order: { payment: { data: { status: 'authorized' } } } },
        },
      },
      {
        action: 'api.orders.captureViaAPI',
        stepName: `[${order}] Trigger the capture`,
        params: { validation: captureSuccess, orderToken, privateKey },
      },
      {
        action: 'api.orders.getProcessorTransactions',
        stepName: `[${order}] Read the requests sent to Bamboo`,
        params: { orderToken, untilTypes: ['authorize', 'capture'] },
        saveAs: operationsKey,
      },
      {
        action: 'api.orders.assertBambooCardData',
        stepName: `[${order}] CardData carries a non-blank CVV and Bamboo captured the order`,
        params: {
          transactions: ref(operationsKey),
          expectedOperations: [
            { type: 'authorize', status: 'authorized' },
            { type: 'capture', status: 'captured' },
          ],
        },
      },
    ];
  }
}
