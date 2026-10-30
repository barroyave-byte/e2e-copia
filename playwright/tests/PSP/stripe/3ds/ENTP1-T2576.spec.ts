import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { randomUUID } from 'crypto';

const configMerchantCheckout = new ConfigMerchantCheckout();

const purchaseStatusConfig = {
  theme: {
    typography: {
      primaryFontFamily: 'Oswald',
    },
  },
  PurchaseStatusView: {
    translations: {
      es: {
        purchaseStatus: {
          info: {
            processed: 'Procesado Informacion - ☸',
            cancelled: 'Pago cancelado - ☸',
            pending: 'Pendiente - ☸',
            pending_3ds: 'Pendiente de 3DS - ☸',
            denied: 'Denegado - ☸',
          },
          message: {
            processed: 'message Procesado - ☸',
            cancelled: 'message Cancelled - ☸',
            pending: 'message Pendiente - ☸',
            pending_3ds: 'message Pendiente de 3DS - ☸',
            denied: 'message Denegado - ☸',
          },
          redirecting: 'Desde Postman Theme',
        },
      },
    },
  },
};

const widgetGeneralsConfig = {
  user_experience: {
    render_3ds_strategy: 'redirect',
  },
};

const elementsConfig = {
  theme_config: [
    {
      id: randomUUID(),
      name: 'gotzilla3',
      config: JSON.stringify(purchaseStatusConfig),
    },
  ],
};

test.describe(
  '@regression [nextAction]: 3ds Redirect Page personalization config',
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
      const setup = await configMerchantCheckout.basicSetup('MX');
      merchantId = setup.merchantId;
      merchantToken = setup.merchantToken;
      merchantName = setup.merchantName;
      privateKey = setup.privateKey;
      publicKey = setup.publicKey;
      const tokenized = await emaService.tokenizeDeunaCheckoutOrder('MX', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripe3dsProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig, elementsConfig },
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2576 [nextAction]: 3ds Redirect Page personalization config',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
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
              params: { timeout: 30000 },
              stepName: 'The next action widget shows Go to Site button',
            },
            {
              action: 'checkout.3ds.complete3DSChallengeStripeKeepOpen',
              stepName: 'The user completes the 3DS challenge on redirect popup',
            },
            {
              action: 'checkout.3ds.assertPurchaseStatusViewText',
              params: { text: 'Procesado Informacion' },
              stepName: 'PurchaseStatusView shows custom processed info translation',
            },
            {
              action: 'checkout.3ds.assertPurchaseStatusViewText',
              params: { text: 'message Procesado' },
              stepName: 'PurchaseStatusView shows custom processed message translation',
            },
            {
              action: 'checkout.3ds.assertPurchaseStatusViewText',
              params: { text: 'Desde Postman Theme' },
              stepName: 'PurchaseStatusView shows custom redirecting translation',
            },
            {
              action: 'checkout.3ds.closePurchaseStatusPopup',
              stepName: 'Close the PurchaseStatusView popup after assertions',
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
          ],
        });
      }
    );
  }
);
