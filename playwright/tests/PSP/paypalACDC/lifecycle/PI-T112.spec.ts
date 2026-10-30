import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as validationRefund from '@support/interfaces/refundV2';
import * as voidData from '@support/interfaces/void';

const PROCESSOR = processorsConfig.paypalACDCProcessor;
const CARD = creditCardData.paypalACDCVisaSucessful;

test.describe(
  '@regression Pays with PayPal ACDC MX',
  { tag: ['@preprod', '@payments_integration', '@team_payment_integration'] },
  () => {
    test(
      '@PI-T112 Ciclo de vida de un purchase directo con PayPal ACDC: void rechazado, refund total y refund repetido rechazado',
      {
        tag: [
          '@preprod',
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
              stepName: 'Create PayPal ACDC processor with automatic capture',
              params: { processorConfig: PROCESSOR },
            },
            {
              action: 'setup.order.createOrder',
              stepName: 'Create order',
              params: { country: 'MX' },
              saveAs: 'order',
            },
            {
              action: 'api.payment.purchaseV2WithCreditCard',
              stepName: 'Purchase the order',
              params: {
                country: 'MX',
                creditCard: CARD,
                processorName: PROCESSOR.name,
                orderToken: ref('order').at('data.token'),
              },
            },
            {
              action: 'api.payment.assertPurchaseStatus',
              stepName: 'Purchase responds 200',
              params: { expectedStatus: 200 },
            },
            {
              action: 'api.orders.waitForOrderStatus',
              stepName: 'The order is processed',
              params: { status: 'processed', orderToken: ref('order').at('data.token') },
            },
            {
              action: 'api.orders.voidViaAPI',
              stepName: 'Void on a processed order is rejected',
              params: {
                validation: voidData.errorVoidOrderProcessed,
                orderToken: ref('order').at('data.token'),
              },
            },
            {
              action: 'api.orders.refundViaAPI',
              stepName: 'Total refund on a processed order',
              params: {
                validation: validationRefund.successRefundV2,
                orderToken: ref('order').at('data.token'),
              },
            },
            {
              action: 'api.orders.waitForOrderStatus',
              stepName: 'The order is refunded',
              params: { status: 'refunded', orderToken: ref('order').at('data.token') },
            },
            {
              action: 'api.orders.refundViaAPI',
              stepName: 'Refund on an already refunded order is rejected',
              params: {
                validation: validationRefund.errorRefundOrderRefunded,
                orderToken: ref('order').at('data.token'),
              },
            },
          ],
        });
      }
    );
  }
);
