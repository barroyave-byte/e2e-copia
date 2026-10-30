/**
 * ENTP1-T2597 — Regression test: INCS-3163 (stale saved-card BIN in installment events)
 *
 * Elektra flow (checkout-base / Payment Widget, single card, split payment not
 * involved): an authenticated user with a saved card preselected clicks
 * "Agregar una tarjeta" and types a NEW card number. The installment events
 * emitted afterwards must carry the TYPED card BIN — never the saved-card BIN.
 *
 * Bug root cause (modular-checkout): AddCard.onClick stopped clearing
 * CardContext.selectedCardId when leaving the UserCard flow, so
 * useInstallmentEvents resolved the BIN as
 *     selectedCard?.first_six || getBin(card.card_number)
 * and the STALE saved-card first_six always won over the typed BIN. The
 * corruption was invisible in the UI — only the onInstallmentSelected event
 * metadata consumed by the merchant carried the wrong BIN.
 *
 * This test FAILS if:
 * - onBinDetected does not report the saved-card BIN while it is preselected
 * - onBinDetected does not report the typed BIN after "Agregar una tarjeta"
 * - onInstallmentSelected carries the saved-card BIN (407559) instead of the
 *   typed BIN (424242) after switching to the new-card form — the exact
 *   production bug reported by Elektra
 *
 * Config mirrors the Elektra widget: credit card as the only payment method,
 * OrderDetailPattern enabled and the Elektra custom theme.
 */

import * as crypto from 'crypto';
import { expect, test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { createDefaultCampaignMSI } from '@support/interfaces/campaigns/campaignsObject';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { customStyleForElektra } from '@support/mocks/customStyleForElektra';
import { TestingFramework } from 'playwright/framework/core';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';
import { EmailGenerator } from '@support/utils/EmailGenerator';

// ─── Constants ─────────────────────────────────────────────────────────────

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();

const userEmail = EmailGenerator.generateRegisteredUserEmail();

// Saved card seeded for the authenticated user (VISA 407559...)
const savedCard = creditCardData.mercadoPagoVisaCardSuccessful;
const SAVED_CARD_BIN = savedCard.number.slice(0, 6); // '407559'

// Card the user types after clicking "Agregar una tarjeta" (VISA 424242...,
// MSI-eligible with the openpay MX processor)
const newCard = creditCardData.openpayVisaSuccessful;
const NEW_CARD_BIN = newCard.number.slice(0, 6); // '424242'

const installments = '3';

// Order amount in minor units ($1,900.00 MXN) — inside the 3-MSI campaign
// range (min $500, max $100,000)
const ORDER_AMOUNT = 190000;

// ─── Widget Config (Elektra) ────────────────────────────────────────────────

const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules: [
      {
        name: 'OrderDetailPattern',
        props: {},
      },
    ],
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
  elementsConfig: {
    ...newElementsConfig,
    theme_config: [
      {
        id: crypto.randomUUID(),
        name: 'theme_config',
        config: JSON.stringify(customStyleForElektra),
      },
    ],
  },
};

// ─── Test Suite ─────────────────────────────────────────────────────────────

test.describe(
  '@regression Payment Widget: installment events must emit the typed BIN, not the stale saved-card BIN, after "Agregar una tarjeta" (INCS-3163 - Elektra)',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let privateKey: string;
    let publicKey: string;
    let userToken: string;

    let orderToken: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await apiCallNewman.configureWidget(merchantId, merchantToken, generalWidgetConfig);

      // Register the authenticated user and seed the saved card (INCS-3163
      // precondition: registered user WITH a saved card preselected)
      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: savedCard.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        savedCard,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);

      orderToken = (
        await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
          amount: ORDER_AMOUNT,
          user_email: userEmail,
        })
      ).data.token;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.openPayProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2597 Payment Widget: onInstallmentSelected emits the typed BIN after switching from the saved card to a new card (INCS-3163 - Elektra)',
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
              action: 'admin.consolidatedFlows.goToAdminAndSetMerchantId',
              params: { merchantId: merchantId },
              stepName: 'Go to admin and set merchant id',
            },
            {
              action: 'admin.consolidatedFlows.configureInstallmentCampaign',
              params: { campaign: createDefaultCampaignMSI(installments) },
              stepName: 'Configure MSI campaign from admin',
            },
            {
              action: 'checkout.openCheckout',
              params: {
                privateKey: privateKey,
                publicKey: publicKey,
                orderToken: orderToken,
                experienceType: 'Payment Widget',
                userToken,
              },
              stepName: 'Navigate to the payment screen as authenticated user',
            },
            {
              action: 'checkout.paymentWidget.assertSavedCardIsPreselected',
              stepName: 'The saved card is preselected on widget load',
            },
            {
              action: 'analytics.events.verifyMetadata',
              params: {
                event: CheckoutEventsName.onBinDetected,
                expected: { cardBin: SAVED_CARD_BIN },
                timeout: 10000,
              },
              stepName: 'onBinDetected reports the saved-card BIN while it is preselected',
            },
            {
              action: 'checkout.paymentWidget.clickAddNewCard',
              stepName: 'The user clicks "Agregar una tarjeta" — leaves the saved-card flow',
            },
            {
              action: 'checkout.paymentWidget.assertUserSeePaymentForm',
              stepName: 'The user sees the new-card payment form',
            },
            {
              action: 'checkout.paymentWidget.fillCreditCardData',
              params: {
                creditCardData: newCard,
                opts: { country: 'MX' },
              },
              stepName: 'The user types the new card (BIN 424242)',
            },
            {
              action: 'analytics.events.verifyMetadata',
              params: {
                event: CheckoutEventsName.onBinDetected,
                expected: {
                  cardBin: expect.stringMatching(new RegExp(`^${NEW_CARD_BIN}`)),
                },
                timeout: 10000,
              },
              stepName: 'onBinDetected reports the TYPED BIN after add-card',
            },
            {
              action: 'checkout.paymentWidget.userSeesInstallmentsDropdown',
              stepName: 'Installments dropdown is shown for the MSI-eligible typed card',
            },
            {
              action: 'checkout.installments.selectMSI',
              params: { installments },
              stepName: 'Select 3 MSI installments',
            },
            {
              action: 'analytics.events.verifyMetadata',
              params: {
                event: CheckoutEventsName.onInstallmentSelected,
                expected: {
                  cardBin: expect.stringMatching(new RegExp(`^${NEW_CARD_BIN}`)),
                  cardIndex: 0,
                  installments: Number(installments),
                },
                timeout: 10000,
              },
              stepName:
                '[INCS-3163 regression] onInstallmentSelected carries the TYPED BIN, never the stale saved-card BIN',
            },
          ],
        });
      }
    );
  }
);
