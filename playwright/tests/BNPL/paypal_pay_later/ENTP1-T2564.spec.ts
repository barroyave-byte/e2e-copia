import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Payment Widget (Form)',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let processorId = '';
    let merchantId = '';
    let merchantToken = '';
    let privateKey = '';
    let publicKey = '';
    let orderToken = '';

    test.beforeEach(async ({ emaService }) => {
      const basicSetup = await configMerchantCheckout.basicSetup('US');
      merchantId = basicSetup.merchantId;
      merchantToken = basicSetup.merchantToken;
      privateKey = basicSetup.privateKey;
      publicKey = basicSetup.publicKey;

      processorId = await apiCallNewman.createPaymentProcessor(
        processorsConfig.paypalPayLaterProcessor,
        merchantId,
        merchantToken
      );

      const orderBody = DeunacheckoutOrderBuilder.createBody('US');
      const order = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = order.data.token;
    });

    test(
      '@ENTP1-T2564 PayPal Pay Later: Successful purchase',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });
        const installments = 1;

        await testing.run({
          step: [
            {
              action: 'checkout.openCheckout',
              params: {
                experienceType: 'Formularios',
                language: 'EN',
                privateKey,
                publicKey,
                orderToken,
              },
              stepName: 'Should opens the testing page and the required form',
            },
            {
              action: 'checkout.bnpl.paypalPayLater.selectPaypalPayLaterForm',
              stepName: 'Should selects PayPal Pay Later as payment method',
            },
            {
              action: 'checkout.bnpl.paypalPayLater.clickPayButtonAndOpenPaypal',
              stepName: 'Should click on the pay button to open the PayPal experience',
            },
            {
              action: 'checkout.bnpl.paypalPayLater.loginInPaypal',
              stepName: 'Should login in PayPal page',
            },
            {
              action: 'checkout.bnpl.paypalPayLater.selectCardInPaypal',
              stepName: 'Should select the card to process the payment',
            },
            {
              action: 'checkout.bnpl.paypalPayLater.clickPayInPaypal',
              stepName: 'Should click on the pay button',
            },
            {
              action: 'checkout.bnpl.paypalPayLater.assertProcessingView',
              stepName: 'The processing view should be displayed',
            },
            {
              action: 'checkout.bnpl.paypalPayLater.assertThankyouPage',
              params: { text: 'Pago completado' },
              stepName: 'The thank you page should be displayed',
            },
            {
              action: 'checkout.bnpl.paypalPayLater.assertOrderDetails',
              params: {
                installments,
                expectedStatus: 'processed',
                expectedPaymentMethod: 'bnpl',
                merchantId,
                orderToken,
              },
              stepName: 'Should validate that the order details are correct',
            },
          ],
        });
      }
    );

    test.afterEach(async () => {
      await ServiceFactory.getService(SERVICE_KEYS.PAYMENT).deletePaymentProcessor(
        processorId,
        merchantId,
        merchantToken
      );
    });
  }
);
