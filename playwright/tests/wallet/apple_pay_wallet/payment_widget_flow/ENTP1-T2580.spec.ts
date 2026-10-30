import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant_memoize';

test.describe(
  '@regression Apple Pay Wallet - Formularios (Payment Widget single-processor)',
  { tag: ['@checkout', '@checkout_base', '@payment_widget', '@wallet'] },
  () => {
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;

    test.beforeAll(async ({ emaService, walletCredentialsService }) => {
      const merchant = await ConfigMerchant.basicSetup('MX', processorsConfig.kushkiProcessor);
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      // Provision the apple_pay wallet credential in the backend so the
      // modular-checkout iframe can resolve it at button-mount time.
      // Browser-level Apple Pay APIs (ApplePaySession, merchant validation)
      // are still mocked because Chromium has no native Apple Pay support.
      await walletCredentialsService.createApplePayCredential(
        merchant.merchantToken,
        merchant.merchantId
      );

      orderToken = (await emaService.tokenizeDeunaNowOrder('MX', privateKey)).data.token;
    });

    test(
      '@ENTP1-T2580 Apple Pay happy path via Formularios + Payment Widget (mocked SDK)',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            { action: 'checkout.wallet.applePay.installMocks' },
            {
              action: 'checkout.openCheckout',
              params: {
                privateKey: privateKey,
                publicKey: publicKey,
                orderToken: orderToken,
                experienceType: 'Formularios',
              },
            },
            { action: 'checkout.wallet.applePay.selectForm' },
            { action: 'checkout.wallet.applePay.clickPay' },
            { action: 'checkout.wallet.applePay.assertWalletButtonVisible' },
            { action: 'checkout.wallet.applePay.clickWalletButton' },
            { action: 'checkout.wallet.applePay.triggerSuccessAuthorization' },
          ],
        });
      }
    );
  }
);
