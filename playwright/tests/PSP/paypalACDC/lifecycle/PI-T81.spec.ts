import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as validationCapture from '@support/interfaces/capture';
import * as validationRefund from '@support/interfaces/refundV2';
import * as voidData from '@support/interfaces/void';

const PROCESSOR = processorsConfig.paypalACDCProcessorAuthorize;
const CARD = creditCardData.paypalACDCVisaSucessful;

// Each order ends in a different terminal state (voided, refunded, partial_captured), so the
// lifecycle needs three authorizations. They run one after another on purpose: concurrent
// AUTHORIZE purchases with the same sandbox card are what PayPal answers with PAYER_CANNOT_PAY.
test.describe(
  '@regression Pays with PayPal ACDC MX',
  { tag: ['@preprod', '@payments_integration', '@team_payment_integration'] },
  () => {
    test(
      '@PI-T81 Ciclo de vida de una transacción autorizada con PayPal ACDC: void, capture total, capture parcial y refund, con sus rechazos por estado',
      {
        tag: [
          '@preprod',
          '@capture',
          '@partial_capture',
          '@void',
          '@refund',
          '@payments_integration',
          '@team_payment_integration',
          '@api',
        ],
      },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            {
              action: 'setup.merchant.basicSetup',
              stepName: 'Create merchant in MX',
              params: { country: 'MX' },
            },
            {
              action: 'setup.processor.createProcessor',
              stepName: 'Create PayPal ACDC processor with manual capture',
              params: { processorConfig: PROCESSOR },
            },

            // Order 1: authorized -> voided
            {
              action: 'setup.order.createOrder',
              stepName: '[Void] Create order',
              params: { country: 'MX' },
              saveAs: 'voidOrder',
            },
            {
              action: 'api.payment.purchaseV2WithCreditCard',
              stepName: '[Void] Authorize the order',
              params: {
                country: 'MX',
                creditCard: CARD,
                processorName: PROCESSOR.name,
                orderToken: ref('voidOrder').at('data.token'),
              },
            },
            {
              action: 'api.payment.assertPurchaseStatus',
              stepName: '[Void] Purchase responds 200',
              params: { expectedStatus: 200 },
            },
            {
              action: 'api.orders.waitForOrderStatus',
              stepName: '[Void] The order is authorized',
              params: { status: 'authorized', orderToken: ref('voidOrder').at('data.token') },
            },
            {
              action: 'api.orders.refundViaAPI',
              stepName: '[Void] Refund on an authorized order is rejected',
              params: {
                validation: validationRefund.errorRefundOrderAuthorized,
                amount: 3000,
                orderToken: ref('voidOrder').at('data.token'),
              },
            },
            {
              action: 'api.orders.captureViaAPI',
              stepName: '[Void] Capture greater than the authorized amount is rejected',
              params: {
                validation: validationCapture.errorCaptureAmountGreaterV2,
                amount: 555000,
                orderToken: ref('voidOrder').at('data.token'),
              },
            },
            {
              action: 'api.orders.waitForOrderStatus',
              stepName: '[Void] The rejected capture leaves the order authorized',
              params: { status: 'authorized', orderToken: ref('voidOrder').at('data.token') },
            },
            {
              action: 'api.orders.voidViaAPI',
              stepName: '[Void] Total void on an authorized order',
              params: {
                validation: voidData.successVoid,
                orderToken: ref('voidOrder').at('data.token'),
              },
            },
            {
              action: 'api.orders.waitForOrderStatus',
              stepName: '[Void] The order is voided',
              params: { status: 'voided', orderToken: ref('voidOrder').at('data.token') },
            },
            {
              action: 'api.orders.refundViaAPI',
              stepName: '[Void] Partial refund on a voided order is rejected',
              params: {
                validation: validationRefund.errorPartialRefundOrderVoided,
                amount: 1000,
                orderToken: ref('voidOrder').at('data.token'),
              },
            },

            // Order 2: authorized -> captured -> refunded
            {
              action: 'setup.order.createOrder',
              stepName: '[Capture + refund] Create order',
              params: { country: 'MX' },
              saveAs: 'refundOrder',
            },
            {
              action: 'api.payment.purchaseV2WithCreditCard',
              stepName: '[Capture + refund] Authorize the order',
              params: {
                country: 'MX',
                creditCard: CARD,
                processorName: PROCESSOR.name,
                orderToken: ref('refundOrder').at('data.token'),
              },
            },
            {
              action: 'api.payment.assertPurchaseStatus',
              stepName: '[Capture + refund] Purchase responds 200',
              params: { expectedStatus: 200 },
            },
            {
              action: 'api.orders.waitForOrderStatus',
              stepName: '[Capture + refund] The order is authorized',
              params: { status: 'authorized', orderToken: ref('refundOrder').at('data.token') },
            },
            {
              action: 'api.orders.captureViaAPI',
              stepName: '[Capture + refund] Total capture',
              params: {
                validation: validationCapture.captureSuccess,
                orderToken: ref('refundOrder').at('data.token'),
              },
            },
            {
              action: 'api.orders.waitForOrderStatus',
              stepName: '[Capture + refund] The order is captured',
              params: { status: 'captured', orderToken: ref('refundOrder').at('data.token') },
            },
            {
              action: 'api.orders.voidViaAPI',
              stepName: '[Capture + refund] Void on a captured order is rejected',
              params: {
                validation: voidData.errorVoidOrderCaptured,
                orderToken: ref('refundOrder').at('data.token'),
              },
            },
            {
              action: 'api.orders.refundViaAPI',
              stepName: '[Capture + refund] Total refund on a captured order',
              params: {
                validation: validationRefund.successRefundV2,
                orderToken: ref('refundOrder').at('data.token'),
              },
            },
            {
              action: 'api.orders.waitForOrderStatus',
              stepName: '[Capture + refund] The order is refunded',
              params: { status: 'refunded', orderToken: ref('refundOrder').at('data.token') },
            },
            {
              action: 'api.orders.voidViaAPI',
              stepName: '[Capture + refund] Void on a refunded order is rejected',
              params: {
                validation: voidData.errorVoidOrderRefunded,
                orderToken: ref('refundOrder').at('data.token'),
              },
            },

            // Order 3: authorized -> partial_captured
            {
              action: 'setup.order.createOrder',
              stepName: '[Partial capture] Create order',
              params: { country: 'MX' },
              saveAs: 'partialCaptureOrder',
            },
            {
              action: 'api.payment.purchaseV2WithCreditCard',
              stepName: '[Partial capture] Authorize the order',
              params: {
                country: 'MX',
                creditCard: CARD,
                processorName: PROCESSOR.name,
                orderToken: ref('partialCaptureOrder').at('data.token'),
              },
            },
            {
              action: 'api.payment.assertPurchaseStatus',
              stepName: '[Partial capture] Purchase responds 200',
              params: { expectedStatus: 200 },
            },
            {
              action: 'api.orders.waitForOrderStatus',
              stepName: '[Partial capture] The order is authorized',
              params: {
                status: 'authorized',
                orderToken: ref('partialCaptureOrder').at('data.token'),
              },
            },
            {
              action: 'api.orders.captureViaAPI',
              stepName: '[Partial capture] Capture an amount lower than the authorized one',
              params: {
                validation: validationCapture.captureSuccess,
                amount: 10,
                orderToken: ref('partialCaptureOrder').at('data.token'),
              },
            },
            {
              action: 'api.orders.waitForOrderStatus',
              stepName: '[Partial capture] The order is partial_captured',
              params: {
                status: 'partial_captured',
                orderToken: ref('partialCaptureOrder').at('data.token'),
              },
            },
            {
              action: 'api.orders.captureViaAPI',
              stepName:
                '[Partial capture] A second capture on a partial_captured order is rejected',
              params: {
                validation: validationCapture.errorCaptureOrderCaptured,
                amount: 9,
                orderToken: ref('partialCaptureOrder').at('data.token'),
              },
            },
            {
              action: 'api.orders.waitForOrderStatus',
              stepName: '[Partial capture] The order stays partial_captured',
              params: {
                status: 'partial_captured',
                orderToken: ref('partialCaptureOrder').at('data.token'),
              },
            },
          ],
        });
      }
    );
  }
);
