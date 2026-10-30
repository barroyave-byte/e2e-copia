import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { TestingFramework } from 'playwright/framework/core';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';

const configMerchantCheckout = new ConfigMerchantCheckout();

const widgetGeneralsConfig = {
  user_experience: {
    render_3ds_strategy: 'iframe',
  },
};

test.describe(
  '@regression Unlimit - Payconnect: purchase con 3DS exitoso valida evento paymentMethods3dsInitiated y creación de tarjeta',
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
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.unlimitProcessorPayconnectWithThreeDS,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig },
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2462 Unlimit - Payconnect: purchase con 3DS exitoso valida evento paymentMethods3dsInitiated y creación de tarjeta',
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
                experienceType: 'Payment Widget',
              },
              stepName: 'The user opens the testing page and Payment Widget',
            },
            {
              action: 'checkout.paymentWidget.fillCreditCardData',
              params: {
                creditCardData: creditCardData.unlimitThreeDSProcessed,
                opts: { country: 'MX' },
              },
              stepName: 'The user inserts a credit card unlimit confirmed from DeunaNow',
            },
            {
              action: 'checkout.paymentWidget.clickOnPayButton',
              stepName: 'The user clicks pay',
            },
            {
              action: 'checkout.paymentWidget.completeUnlimit3DSInIframe',
              stepName: 'The user completes the 3DS challenge and the card is created successfully',
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
                  processor_name: 'unlimit',
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
