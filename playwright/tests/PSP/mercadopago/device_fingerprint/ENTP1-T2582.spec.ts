import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';

test.describe(
  '@regression Payment Widget: Mercado Pago device fingerprint is sent in purchase request',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    test(
      '@ENTP1-T2582 Payment Widget: MercadoPago -Device fingerprint is been send into purchase request',
      { tag: ['@team_payment_integration', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            {
              action: 'setup.merchant.basicSetup',
              params: { country: 'MX' },
              stepName: 'Create merchant for MX',
            },
            {
              action: 'setup.processor.createProcessor',
              params: { processorConfig: processorsConfig.mercadoPagoProcessor },
              stepName: 'Create Mercado Pago credit payment processor',
            },
            {
              action: 'setup.order.createOrder',
              params: { country: 'MX' },
              stepName: 'Tokenize a deuna_now order',
            },
            {
              action: 'checkout.openCheckout',
              params: {
                experienceType: 'Payment Widget',
                antiFraudProviders: { MERCADOPAGO: {} },
              },
              stepName: 'Open Payment Widget with Mercado Pago selected as fraud provider',
            },
            // Workaround: on the first open the Mercado Pago SDK does not inject
            // device_id into the purchase payload. Closing and reopening the
            // widget forces the SDK to emit it on the next purchase request.
            // Remove this step once the upstream SDK bug is fixed.
            {
              action: 'checkout.paymentWidget.closeAndReopenPaymentWidget',
              stepName: 'Close and reopen Payment Widget (workaround so device_id is sent)',
            },
            {
              action: 'checkout.paymentWidget.fillCreditCardData',
              params: {
                creditCardData: creditCardData.mercadopagoMasterCardSuccessfulMX,
                opts: { country: 'MX' },
              },
              stepName: 'Fill credit card data',
            },
            {
              action: 'checkout.paymentWidget.clickPay',
              stepName: 'Click pay and capture purchase request',
            },
            {
              action: 'checkout.paymentWidget.assertDeviceIdInPurchaseRequest',
              params: { antiFraudProvider: ['MERCADOPAGO'] },
              stepName: 'Decoded device_id JSON has MERCADOPAGO key',
            },
            {
              action: 'checkout.paymentWidget.assertProcessorNameInPurchaseRequest',
              params: { expectedProcessorName: 'mercadopago' },
              stepName: 'processor_name in purchase payload is mercadopago',
            },
          ],
        });
      }
    );
  }
);
