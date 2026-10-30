import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import { createDeunaWalletProcessor } from '@support/interfaces/payment_processors';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

test.describe(
  '@regression @visual Deuna Wallet Code - Formularios - UI Visual Consistency',
  { tag: ['@forms', '@voucher', '@team_enterprise', '@visual'] },
  () => {
    test(
      '@ENTP1-T2664 [VISUAL] Deuna Wallet Código: Validación visual de vista post-purchase (código 6 dígitos) en Formularios',
      { tag: ['@visual'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            {
              action: 'setup.merchant.basicSetup',
              params: { country: 'EC' },
              stepName: 'Setup basic EC merchant',
            },
            {
              action: 'setup.processor.createProcessor',
              params: { processorConfig: createDeunaWalletProcessor('code', false) },
              stepName: 'Configure Deuna Wallet processor (Code format)',
            },
            {
              action: 'setup.order.tokenizeOrder',
              params: {
                orderData: DeunacheckoutOrderBuilder.createBody('EC', { amount: 5000 }),
              },
              stepName: 'Tokenize order with valid EC amount',
            },
            {
              action: 'checkout.openCheckout',
              params: { experienceType: 'Formularios' },
              stepName: 'Open Formularios experience',
            },
            {
              action: 'checkout.voucher.deunaWallet.selectDeunaWalletForm',
              stepName: 'Select Deuna Wallet and embed — purchase triggers directly (Code flow)',
            },
            {
              action: 'checkout.voucher.deunaWallet.assertDeunaWalletVoucher',
              params: { price: 'USD 50.00', format: 'code' },
              stepName: 'Verify post-purchase voucher (price, headings, 6-digit code) is visible',
            },
            {
              action: 'checkout.voucher.deunaWallet.verifyVoucherVisualConsistency',
              params: { snapshotName: 'deuna-wallet-code-post-purchase' },
              stepName: '[VISUAL] Verify Deuna Wallet Code post-purchase view consistency',
            },
          ],
        });
      }
    );
  }
);
