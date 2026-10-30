import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { TestingFramework } from 'playwright/framework/core';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Stripe: Next Action Widget 3DS validates paymentMethods3dsInitiated event',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaCheckoutOrder('MX', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripe3dsProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2461 Stripe: Next Action Widget 3DS validates paymentMethods3dsInitiated event',
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
              },
              stepName: 'The user navigates to Formularios',
            },
            {
              action: 'checkout.forms.fillCreditCardData',
              params: { creditCardData: creditCardData.stripe3dsPass },
              stepName: 'The user fills credit card information',
            },
            {
              action: 'checkout.forms.clickFinalizePurchase',
              params: { isPurchaseV1: true },
              stepName: 'The user clicks finalize purchase',
            },
            {
              action: 'checkout.nextAction.assertGoToSiteButtonVisible',
              stepName: 'The next action widget shows Go to Site button',
            },
            {
              action: 'checkout.3ds.complete3DSChallengeStripe',
              stepName: 'The user completes the 3DS challenge on the popup',
            },
            {
              action: 'admin.orders.goToOrder',
              params: { merchantId: merchantId, orderToken: orderToken },
              stepName: 'Order is validated through admin',
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
