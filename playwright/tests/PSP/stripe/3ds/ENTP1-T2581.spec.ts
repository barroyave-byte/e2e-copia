import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';

const configMerchantCheckout = new ConfigMerchantCheckout();

const purchaseStatusPTConfig = {
  theme: {
    typography: {
      primaryFontFamily: 'Oswald',
    },
  },
  PurchaseStatusView: {
    translations: {
      pt: {
        purchaseStatus: {
          info: {
            processed: 'Processado Info PT - ☸',
            cancelled: 'Pagamento cancelado PT - ☸',
            pending: 'Pendente PT - ☸',
            pending_3ds: 'Pendente 3DS PT - ☸',
            denied: 'Negado PT - ☸',
          },
          message: {
            processed: 'message Processado PT - ☸',
            cancelled: 'message Cancelado PT - ☸',
            pending: 'message Pendente PT - ☸',
            pending_3ds: 'message Pendente 3DS PT - ☸',
            denied: 'message Negado PT - ☸',
          },
          redirecting: 'Redirecionando PT',
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

test.describe(
  '@regression [nextAction]: purchase status view personalization cssFile & language',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let themeData: { id: string; name: string };
    const themeName = 'PurchaseStatusPTCssFileE2E';

    let merchantId: string;
    let merchantToken: string;

    let merchantName: string;

    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    let orderId: string;

    test.beforeAll(async ({ emaService, checkoutConfigurationService }) => {
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
        processorsConfig.stripe3dsProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig },
        merchantId,
        merchantToken
      );

      const response = await checkoutConfigurationService.createTheme(
        privateKey,
        themeName,
        purchaseStatusPTConfig
      );
      themeData = response.data as any;
    });

    test(
      '@ENTP1-T2581 [nextAction]: purchase status view personalization cssFile & language',
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
                experienceType: 'Payment Widget',
                cssFile: themeData.id,
                language: 'PT',
              },
              stepName: 'The user navigates to Payment Widget with cssFile and PT language',
            },
            {
              action: 'checkout.paymentWidget.fillCreditCardData',
              params: { creditCardData: creditCardData.stripe3dsPass, opts: { country: 'MX' } },
              stepName: 'The user fills credit card information',
            },
            {
              action: 'checkout.paymentWidget.clickOnPayButton',
              params: { withResponse: false },
              stepName: 'The user clicks pay (3DS redirect flow)',
            },
            {
              action: 'checkout.3ds.complete3DSChallengeStripeKeepOpen',
              stepName: 'The user completes the 3DS challenge on redirect popup',
            },
            {
              action: 'checkout.3ds.assertPurchaseStatusViewText',
              params: { text: 'Processado Info PT' },
              stepName: 'PurchaseStatusView shows custom PT processed info translation',
            },
            {
              action: 'checkout.3ds.assertPurchaseStatusViewText',
              params: { text: 'message Processado PT' },
              stepName: 'PurchaseStatusView shows custom PT processed message translation',
            },
            {
              action: 'checkout.3ds.assertPurchaseStatusViewText',
              params: { text: 'Redirecionando PT' },
              stepName: 'PurchaseStatusView shows custom PT redirecting translation',
            },
            {
              action: 'checkout.3ds.closePurchaseStatusPopup',
              stepName: 'Close the PurchaseStatusView popup after assertions',
            },
            {
              action: 'admin.orders.goToOrder',
              params: { merchantId: merchantId, orderToken: orderToken },
              stepName: 'Navigate to order in admin',
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
