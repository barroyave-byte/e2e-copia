import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant_memoize';

test.describe(
  '@regression Google Pay Wallet - Formularios (Payment Widget single-processor)',
  { tag: ['@checkout', '@checkout_base', '@payment_widget', '@wallet'] },
  () => {
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;

    test.beforeAll(async ({ emaService, walletCredentialsService }) => {
      const merchant = await ConfigMerchant.basicSetup('MX', processorsConfig.kushkiProcessor);
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      // Provision the google_pay wallet credential in the backend so the
      // modular-checkout iframe can resolve it at button-mount time.
      // Browser-level Google Pay APIs (PaymentsClient, loadPaymentData) are
      // still mocked because Chromium has no native Google Pay support.
      await walletCredentialsService.createGooglePayCredential(
        merchant.merchantToken,
        merchant.merchantId
      );

      orderToken = (await emaService.tokenizeDeunaNowOrder('MX', privateKey)).data.token;
    });

    test(
      '@ENTP1-T2579 Google Pay happy path via Formularios + Payment Widget (mocked SDK)',
      { tag: ['@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            { action: 'checkout.wallet.googlePay.installMocks' },
            {
              action: 'checkout.openCheckout',
              params: {
                privateKey: privateKey,
                publicKey: publicKey,
                orderToken: orderToken,
                experienceType: 'Formularios',
              },
            },
            { action: 'checkout.wallet.googlePay.selectForm' },
            { action: 'checkout.wallet.googlePay.clickPay' },
            { action: 'checkout.wallet.googlePay.assertWalletButtonVisible' },
            { action: 'checkout.wallet.googlePay.clickWalletButton' },
          ],
        });
      }
    );
  }
);
