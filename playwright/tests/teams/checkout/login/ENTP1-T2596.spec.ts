import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { TestingFramework } from 'playwright/framework/core';
import { BasicMerchantResult } from '@support/http/services/MerchantAuthService';
import envConfig from '@support/envConfig';

const configMerchant = new ConfigMerchant();

const userEmail = `persist-qa-cdl.qa@deuna.com`;

const widgetAuthConfig = {
  user_experience: {
    user_authentication_flow: true,
    init_with_guest_user: false,
  },
};

test.describe(
  '@regression WebSDK: Test Cross Domain Login',
  { tag: ['@checkout', '@deuna-web-sdk', '@payment_widget'] },
  () => {
    let merchant1: BasicMerchantResult;
    let merchant2: BasicMerchantResult;
    let merchant1OrderToken1: string;
    let merchant1OrderToken2: string;
    let merchant2PaymentLinkUrl: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      merchant1 = await configMerchant.basicSetup('MX');
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchant1.merchantId,
        merchant1.merchantToken
      );
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig: widgetAuthConfig },
        merchant1.merchantId,
        merchant1.merchantToken
      );

      const [t1, t2] = await Promise.all([
        emaService.tokenizeDeunaNowOrder('MX', merchant1.privateKey, { user_email: userEmail }),
        emaService.tokenizeDeunaNowOrder('MX', merchant1.privateKey, { user_email: userEmail }),
      ]);
      merchant1OrderToken1 = t1.data.token;
      merchant1OrderToken2 = t2.data.token;

      await userAuthService
        .registerUserAndSetAddress(
          {
            email: userEmail,
            phone: userAddressCreditCard.userAddressCreditCardMX.phone,
            identity_document: creditCardData.kushkiVisaSuccessfull.document_number,
          },
          {
            merchantId: merchant1.merchantId,
            merchantPrivateKey: merchant1.privateKey,
          }
        )
        .catch((error: Error) => {
          console.warn(
            `[ENTP1-T2590] User already exists, skipping registration: ${error.message}`
          );
        });
      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.kushkiVisaSuccessfull,
        userAddressCreditCard.userAddressCreditCardMX,
        merchant1.merchantId,
        merchant1.privateKey
      );

      merchant2 = await configMerchant.basicSetup('MX');
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchant2.merchantId,
        merchant2.merchantToken
      );
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig: widgetAuthConfig },
        merchant2.merchantId,
        merchant2.merchantToken
      );

      const tokenizedLink = await emaService.tokenizeDeunaPaymentLinkOrder(
        'MX',
        merchant2.privateKey,
        {
          user_email: userEmail,
        }
      );
      merchant2PaymentLinkUrl = envConfig.URL_CHECKOUT_BASE_LOCAL
        ? new URL(`/${tokenizedLink.data.token}`, envConfig.URL_CHECKOUT_BASE_LOCAL).toString()
        : tokenizedLink.data.order.payment_link;
    });

    test(
      '@ENTP1-T2596 Test Cross Domain Login',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            // Phase 1: First open – user prompted for OTP, logs in, sees saved cards
            {
              action: 'checkout.websdk.goToHarness',
              stepName: 'Go to harness app (merchant 1 — first open)',
            },
            {
              action: 'checkout.websdk.init',
              params: { publicApiKey: merchant1.publicKey },
              stepName: 'Initialize WebSDK with merchant 1',
            },
            {
              action: 'checkout.websdk.openPaymentWidget',
              params: { orderToken: merchant1OrderToken1 },
              stepName: 'Open Payment Widget (merchant 1, order 1)',
            },

            {
              action: 'checkout.paymentWidget.enterOtpCode',
              stepName: 'Enter OTP to authenticate',
            },
            {
              action: 'checkout.paymentWidget.assertSavedCardsVisible',
              stepName: 'Verify saved cards are visible after OTP login',
            },

            // // Phase 2: Close and reopen same merchant – session persists, no OTP
            {
              action: 'checkout.websdk.goToHarness',
              stepName: 'Navigate to harness again (simulates widget close)',
            },
            {
              action: 'checkout.websdk.init',
              params: { publicApiKey: merchant1.publicKey },
              stepName: 'Re-initialize WebSDK with merchant 1',
            },
            {
              action: 'checkout.websdk.openPaymentWidget',
              params: { orderToken: merchant1OrderToken2 },
              stepName: 'Reopen Payment Widget (merchant 1, order 2)',
            },
            {
              action: 'checkout.paymentWidget.assertSavedCardsVisible',
              stepName: 'Verify saved cards visible without OTP (session persists after reopen)',
            },

            // // Phase 3: New merchant with payment link order – navigate via redirect, session persists, no OTP
            {
              action: 'checkout.websdk.openCheckoutUrl',
              params: { url: merchant2PaymentLinkUrl },
              stepName: 'Navigate directly to payment link URL (merchant 2 — redirect flow)',
            },
            {
              action: 'checkout.paymentLink.assertSavedCardsVisible',
              stepName:
                'Verify saved cards visible without OTP after payment link redirect (session persists)',
            },

            // // Phase 4: Logout
            {
              action: 'checkout.paymentLink.logout',
              stepName: 'Log out by clicking "Cerrar sesión"',
            },
          ],
        });
      }
    );
  }
);
