import * as apiCallNewman from '@support/newman/apiCallNewman';
import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { TestingFramework } from 'playwright/framework/core';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { buildStripe3dsOrder } from '@tests/PSP/stripe/3ds/common/TokenizeOrderStripe3ds';

const configMerchant = new ConfigMerchant();

const generalWidgetConfig = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules: [],
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
};

test.describe(
  '@regression Stripe: VaultWidget + Next Action Widget 3DS validates paymentMethods3dsInitiated event',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, buildStripe3dsOrder()))
        .data.token;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripe3dsProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test(
      '@ENTP1-T2499 Stripe: VaultWidget + Next Action Widget 3DS validates paymentMethods3dsInitiated event',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            {
              action: 'analytics.events.startCapture',
              stepName: 'Start capturing analytics events before navigation',
            },
            {
              action: 'checkout.openCheckout',
              params: {
                privateKey: privateKey,
                publicKey: publicKey,
                orderToken: orderToken,
                experienceType: 'Formularios',
                vaultWebSdkConfig: { withInitNextAction: true },
              },
              stepName: 'Open the Formularios experience',
            },
            {
              action: 'payment.page.selectPaymentMethod',
              params: { method: 'Payment Vault (Web SDK)' },
              stepName: 'Select Payment Vault (Web SDK) as payment method',
            },
            {
              action: 'payment.page.clickOnPayButtonEmbedded',
              stepName: 'Open the embedded vault widget',
            },
            {
              action: 'checkout.vault.fillFormVault',
              params: {
                creditCardData: creditCardData.stripe3dsPass,
                opts: { avoidInstallmentsCall: true, country: 'MX' },
              },
              stepName: 'Fill in new card details',
            },
            {
              action: 'checkout.vault.clickOnPay',
              params: { withSuccessAssertion: true },
              stepName: 'User clicks pay and vaultSaveSuccess is observed',
            },
            {
              action: 'checkout.vault.assertOrderStatusRequestPurchaseV2',
              params: { status: 'pending_3ds', statusCode: 200 },
              stepName: 'Purchase V2 returns pending_3ds',
            },
            {
              action: 'checkout.nextAction.assertGoToSiteButtonVisible',
              stepName: 'Next Action widget shows the Go to Site button',
            },
            {
              action: 'checkout.3ds.complete3DSChallengeStripe',
              stepName: 'Complete the Stripe 3DS challenge in the popup',
            },
            {
              action: 'admin.orders.goToOrder',
              params: { merchantId: merchantId, orderToken: orderToken },
              stepName: 'Validate the order through admin',
            },
            {
              action: 'admin.orders.assertStatus',
              params: { status: 'processed' },
              stepName: 'Order status is processed',
            },
            {
              action: 'analytics.events.verifyMetadata',
              params: {
                event: CheckoutEventsName.paymentMethods3dsInitiated,
                expected: {
                  processor_name: 'stripe_direct',
                  payment_method: 'credit_card',
                },
              },
              stepName: 'Validate paymentMethods3dsInitiated event metadata',
            },
          ],
        });
      }
    );
  }
);
