import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { bizumPushProcessor } from '@support/interfaces/payment_processors';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

test.describe(
  '@regression @visual Bizum Push - Formularios - UI Visual Consistency',
  { tag: ['@forms', '@bizum', '@team_enterprise', '@visual'] },
  () => {
    test(
      '@ENTP1-T2659 [VISUAL] Bizum Push: Validación visual de formulario vacío, mensaje de error y vista de referencia en Formularios',
      { tag: ['@visual'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            {
              action: 'setup.merchant.basicSetup',
              params: { country: 'ES' },
              stepName: 'Setup basic ES merchant',
            },
            {
              action: 'setup.processor.createProcessor',
              params: { processorConfig: bizumPushProcessor },
              stepName: 'Configure Bizum Push processor',
            },
            {
              action: 'setup.order.tokenizeOrder',
              params: {
                orderData: DeunacheckoutOrderBuilder.createBody('ES', { amount: 700 }),
              },
              stepName: 'Tokenize order with amount 7 EUR',
            },
            {
              action: 'checkout.openCheckout',
              params: { experienceType: 'Formularios' },
              stepName: 'Open Formularios experience',
            },
            {
              action: 'checkout.wallet.bizum.selectBizumTab',
              stepName: 'Select Bizum payment method tab',
            },
            {
              action: 'checkout.wallet.bizum.waitUntilLoadPage',
              stepName: 'Wait until Bizum phone input is loaded',
            },
            {
              action: 'checkout.wallet.bizum.verifyFormVisualConsistency',
              params: { snapshotName: 'bizum-push-form-empty' },
              stepName: '[VISUAL] Verify empty Bizum form consistency',
            },
            {
              action: 'checkout.wallet.bizum.clickPay',
              stepName: 'Click Pay button with empty form',
            },
            {
              action: 'checkout.wallet.bizum.assertPhoneError',
              stepName: 'Verify phone validation error message is visible',
            },
            {
              action: 'checkout.wallet.bizum.verifyFormVisualConsistency',
              params: { snapshotName: 'bizum-push-form-error-visible' },
              stepName: '[VISUAL] Verify Bizum form with error message consistency',
            },
            {
              action: 'checkout.wallet.bizum.fillPhoneNumber',
              params: { phone: '700000000' },
              stepName: 'Fill valid phone number',
            },
            {
              action: 'checkout.wallet.bizum.clickPayAndCapturePurchaseResponse',
              stepName: 'Click Pay and capture purchase response',
            },
            {
              action: 'checkout.wallet.bizum.assertPurchasePendingResponse',
              stepName: 'Verify purchase response is pending',
            },
            {
              action: 'checkout.wallet.bizum.assertBizumVoucher',
              stepName: 'Assert Bizum reference / voucher view is displayed',
            },
            {
              action: 'checkout.wallet.bizum.verifyVoucherVisualConsistency',
              params: { snapshotName: 'bizum-push-reference-view' },
              stepName: '[VISUAL] Verify Bizum reference notification view consistency',
            },
          ],
        });
      }
    );
  }
);
