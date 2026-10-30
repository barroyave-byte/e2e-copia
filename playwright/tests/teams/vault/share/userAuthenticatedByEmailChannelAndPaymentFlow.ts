import { FlowSteps } from 'playwright/framework/core';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as userData from '@support/interfaces/user_data';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { CheckoutEventsName, VaultEventsName } from '@tests/events/checkoutEventsName';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const email = EmailGenerator.generateRegisteredUserEmail();

const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules: [
      {
        name: 'BillingPattern',
        props: {
          show_in_main_view: false,
          fields: [
            {
              name: 'first_name',
              validation: {
                required: true,
              },
            },
          ],
        },
      },
    ],
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
  elementsConfig: {
    ...newElementsConfig,
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

interface Configurations {
  interactionType?: 'fill' | 'press';
}

export class UserAuthenticatedByEmailChannelAndPaymentFlow {
  /** Tokenized in `globalSetup`, handed to the steps that open the order. */
  private orderToken: string;

  private privateKey: string;
  private publicKey: string;
  config: Configurations;
  constructor(config: Configurations) {
    this.config = config;
  }

  private async createCard(creditCard: creditCardData.BaseCreditCard) {
    await apiCallNewman.setCreditCardForUserInNetwork(
      email,
      creditCard,
      userAddressCreditCard.userAddressCreditCardMX,
      userData.userDataMX,
      this.privateKey
    );
  }

  globalSetup() {
    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchantSetup = await configMerchant.basicSetup('MX');
      const { merchantId, merchantToken } = merchantSetup;
      this.privateKey = merchantSetup.privateKey;
      this.publicKey = merchantSetup.publicKey;

      await userAuthService.registerUserAndSetAddress(
        {
          email: email,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.stripeVisaSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: this.privateKey,
        }
      );

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);

      await this.createCard(creditCardData.stripeVisaSuccessful);
      await this.createCard(creditCardData.conektaMasterCardSuccessful);

      this.orderToken = (
        await emaService.tokenizeDeunaNowOrder('MX', this.privateKey, { user_email: email })
      ).data.token;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripeProcessor,
        merchantId,
        merchantToken
      );
    });
  }

  sequenceEvents() {
    return [
      CheckoutEventsName.checkoutStarted,
      CheckoutEventsName.loginOtpStarted,
      CheckoutEventsName.loginOtpSendSms,
      CheckoutEventsName.loginOtpSendEmail,
      CheckoutEventsName.login,
      CheckoutEventsName.loginOtpAccepted,
      CheckoutEventsName.paymentMethodsStarted,
      CheckoutEventsName.paymentMethodsCardSelected,
      CheckoutEventsName.paymentMethodsEntered,
      CheckoutEventsName.billingSet,
      CheckoutEventsName.billingFormSave,

      CheckoutEventsName.checkoutStarted,
      // Reopening the widget should recognize the already-authenticated session
      // via cross-domain login (one event). In practice this races an async
      // check against the shared CDL storage site, and losing that race falls
      // back to a full re-auth (several events) — both are real, observed
      // product outcomes, not a test bug (ENTP1-T2026 / ENTP1-16976).
      {
        anyOf: [
          [CheckoutEventsName.loginWithCrossDomain],
          [
            CheckoutEventsName.loginOtpStarted,
            CheckoutEventsName.loginOtpSendEmail,
            CheckoutEventsName.login,
            CheckoutEventsName.loginOtpAccepted,
          ],
        ],
      },
      CheckoutEventsName.paymentMethodsStarted,
      CheckoutEventsName.paymentMethodsCardSelected,
      CheckoutEventsName.paymentMethodsEntered,
      CheckoutEventsName.billingSet,
      // The restored billing auto-save and the saved-cards render are two
      // independent async side-effects of the same reopen — paymentMethodsShowMyCards
      // isn't only triggered by our "see more cards" click, it can also fire on
      // its own, so neither order is reliably forceable from the test (ENTP1-T2026).
      {
        anyOf: [
          [CheckoutEventsName.billingFormSave, CheckoutEventsName.paymentMethodsShowMyCards],
          [CheckoutEventsName.paymentMethodsShowMyCards, CheckoutEventsName.billingFormSave],
        ],
      },
      CheckoutEventsName.paymentMethodsCardSelected,
      CheckoutEventsName.paymentMethodsCardSecurityCodeInitiated,
      CheckoutEventsName.paymentMethodsCardSecurityCodeEntered,
      CheckoutEventsName.billingChange,
      CheckoutEventsName.backTo,
      CheckoutEventsName.paymentMethodsCardSecurityCodeEntered,
      CheckoutEventsName.paymentMethodsCardSelected,
      VaultEventsName.vaultSaveClick,
      CheckoutEventsName.paymentProcessing,
      VaultEventsName.vaultSaveSuccess,
    ];
  }

  flowSteps(): FlowSteps {
    return [
      {
        action: 'checkout.openCheckout',
        params: {
          privateKey: this.privateKey,
          publicKey: this.publicKey,
          orderToken: this.orderToken,
          experienceType: 'Formularios',
        },
        stepName: 'Open the Formularios experience',
      },
      {
        action: 'payment.page.selectPaymentMethod',
        params: { method: 'Payment Vault (Web SDK)' },
        stepName: 'Select Payment Vault (Web SDK) as the payment method',
      },
      {
        action: 'payment.page.clickOnPayButtonEmbedded',
        stepName: 'Open the embedded vault widget',
      },
      {
        action: 'checkout.vault.clickOnChangeChannelButton',
        stepName: 'Change default channel to email',
      },
      {
        action: 'core.timing.wait',
        params: { milliseconds: 4000 },
        stepName: 'Wait for the email channel screen to settle',
      },
      {
        action: 'checkout.vault.enterOtpCode',
        stepName: 'Enter the email OTP code',
      },
      {
        action: 'core.timing.wait',
        params: { milliseconds: 4000 },
        stepName: 'Wait for authentication to complete',
      },
      {
        action: 'payment.page.selectPaymentMethod',
        params: { method: 'Tarjeta de crédito' },
        stepName: 'Re-select credit card payment method',
      },
      {
        action: 'payment.page.selectPaymentMethod',
        params: { method: 'Payment Vault (Web SDK)' },
        stepName: 'Re-select Payment Vault (Web SDK) to reopen the widget',
      },
      {
        action: 'payment.page.clickOnPayButtonEmbedded',
        stepName: 'Re-open the embedded vault widget',
      },
      {
        // The widget auto-restores and re-saves billing on reopen. Clicking
        // "see more cards" before that save lands races it — both resolve
        // close together and whichever wins varies run to run (ENTP1-T2026).
        // Wait for the real signal instead of guessing a delay.
        action: 'analytics.events.waitForEvent',
        params: { event: 'billingFormSave', nextOccurrence: true },
        stepName: 'Wait for the restored billing to finish auto-saving',
      },
      {
        action: 'checkout.vault.seeMoreCards',
        stepName: 'Expand the saved cards list',
      },
      {
        action: 'core.timing.wait',
        params: { milliseconds: 2000 },
        stepName: 'Wait for the expanded cards list',
      },
      {
        action: 'checkout.vault.selectSavedCard',
        params: { cardNumber: creditCardData.stripeVisaSuccessful.number },
        stepName: 'Select the previously stored test card',
      },
      {
        action: 'core.timing.wait',
        params: { milliseconds: 2000 },
        stepName: 'Wait for the card detail view',
      },
      {
        action: 'checkout.vault.fillCvvInCardForm',
        params: {
          cvv: creditCardData.stripeVisaSuccessful.cvv_code,
          type: this.config.interactionType,
          avoidInstallmentsCall: true,
        },
        stepName: 'Fill the card CVV',
      },
      {
        action: 'core.timing.wait',
        params: { milliseconds: 2000 },
        stepName: 'Wait before opening billing form',
      },
      {
        action: 'checkout.vault.showBillingFormIFrame',
        stepName: 'Open the billing form drawer',
      },
      {
        action: 'core.timing.wait',
        params: { milliseconds: 2000 },
        stepName: 'Wait for the billing form to render',
      },
      {
        action: 'checkout.vault.backToCardForm',
        stepName: 'Return to the card form',
      },
      {
        action: 'core.timing.wait',
        params: { milliseconds: 2000 },
        stepName: 'Wait before pay click',
      },
      {
        action: 'checkout.vault.clickOnPay',
        stepName: 'User selects pay',
      },
      {
        action: 'checkout.vault.assertOrderStatusRequestPurchaseV2',
        params: { status: 'processed', statusCode: 200 },
        stepName: 'Purchase V2 returns processed status',
      },
      {
        action: 'checkout.vault.assertTransactionPaymentStatus',
        params: { orderToken: this.orderToken, status: 'processed', privateKey: this.privateKey },
        stepName: 'Transaction payment status is processed',
      },
      {
        action: 'core.timing.wait',
        params: { milliseconds: 2000 },
        stepName: 'Wait for trailing analytics events to flush',
      },
    ];
  }
}
