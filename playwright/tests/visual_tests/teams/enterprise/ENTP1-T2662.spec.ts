import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { addiProcessor } from '@support/interfaces/payment_processors';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

test.describe(
  '@regression @visual Addi - Formularios - UI Visual Consistency',
  { tag: ['@forms', '@bnpl', '@team_enterprise', '@visual'] },
  () => {
    test(
      '@ENTP1-T2662 [VISUAL] Addi: Validación visual de formulario embebido vacío, mensaje de error y vista previa de pago en Formularios',
      { tag: ['@visual'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            {
              action: 'setup.merchant.basicSetup',
              params: { country: 'CO' },
              stepName: 'Setup basic CO merchant',
            },
            {
              action: 'setup.processor.createProcessor',
              params: { processorConfig: addiProcessor },
              stepName: 'Configure Addi processor',
            },
            {
              action: 'setup.order.tokenizeOrder',
              params: {
                orderData: DeunacheckoutOrderBuilder.createBody('CO', { amount: 7980000 }),
              },
              stepName: 'Tokenize order with valid CO amount',
            },
            {
              action: 'checkout.openCheckout',
              params: { experienceType: 'Formularios' },
              stepName: 'Open Formularios experience',
            },
            {
              action: 'checkout.bnpl.addi.selectAddiForm',
              stepName: 'Select Addi payment method',
            },
            {
              action: 'checkout.bnpl.addi.clickEmbedPay',
              stepName: 'Click Embedir Pago and wait for embedded reference form',
            },
            {
              action: 'checkout.bnpl.addi.verifyFormVisualConsistency',
              params: { snapshotName: 'addi-form-empty' },
              stepName: '[VISUAL] Verify empty Addi embedded form consistency',
            },
            {
              action: 'checkout.bnpl.addi.submitEmptyReferenceForm',
              stepName: 'Click Pay button with empty embedded form',
            },
            {
              action: 'checkout.bnpl.addi.assertReferenceFormValidationErrors',
              stepName: 'Verify field validation errors are visible',
            },
            {
              action: 'checkout.bnpl.addi.verifyFormVisualConsistency',
              params: { snapshotName: 'addi-form-error-visible' },
              stepName: '[VISUAL] Verify Addi embedded form with errors consistency',
            },
            {
              action: 'checkout.bnpl.addi.fillReferenceModal',
              stepName: 'Fill valid reference data (document, phone, address, department, city)',
            },
            {
              action: 'checkout.bnpl.addi.verifyFormVisualConsistency',
              params: { snapshotName: 'addi-payment-link-view' },
              stepName: '[VISUAL] Verify Addi embedded form payment preview consistency',
            },
          ],
        });
      }
    );
  }
);
