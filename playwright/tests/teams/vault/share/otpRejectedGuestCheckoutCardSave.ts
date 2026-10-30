import { FlowSteps } from 'playwright/framework/core';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userData from '@support/interfaces/user_data';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { CheckoutEventsName, VaultEventsName } from '@tests/events/checkoutEventsName';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const userEmail = EmailGenerator.generateRegisteredUserEmail();

interface Configurations {
  interactionType?: 'fill' | 'press';
}

const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
  },
  elementsConfig: {
    ...newElementsConfig,
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

export class OTPRejectedGuestCheckoutCardSave {
  /** Tokenized in `globalSetup`, handed to the steps that open the order. */
  private orderToken: string;
  private privateKey: string;
  private publicKey: string;

  config: Configurations;

  constructor(config: Configurations) {
    this.config = config;
  }

  globalSetup() {
    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchantSetup = await configMerchant.basicSetup('MX');
      const { merchantId, merchantToken } = merchantSetup;
      this.privateKey = merchantSetup.privateKey;
      this.publicKey = merchantSetup.publicKey;

      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: IDENTITY_DOCUMENTS.MX.RFC,
        },
        {
          merchantId,
          merchantPrivateKey: this.privateKey,
        }
      );

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);

      await apiCallNewman.setCreditCardForUserInNetwork(
        userEmail,
        {
          ...creditCardData.stripeVisaSuccessful,
          document_number: IDENTITY_DOCUMENTS.MX.RFC,
        },
        userAddressCreditCard.userAddressCreditCardMX,
        userData.userDataMX,
        this.privateKey
      );

      this.orderToken = (
        await emaService.tokenizeDeunaNowOrder('MX', this.privateKey, { user_email: userEmail })
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
      CheckoutEventsName.loginOtpRejected,
      CheckoutEventsName.loginOtpContinueAsGuest,
      CheckoutEventsName.paymentMethodsStarted,
      CheckoutEventsName.paymentMethodsSelected,
      CheckoutEventsName.paymentMethodsEntered,
      CheckoutEventsName.paymentMethodsCardNumberInitiated,
      CheckoutEventsName.paymentMethodsCardNumberEntered,
      CheckoutEventsName.paymentMethodsCardExpirationDateInitiated,
      CheckoutEventsName.paymentMethodsCardExpirationDateEntered,
      CheckoutEventsName.paymentMethodsCardSecurityCodeInitiated,
      CheckoutEventsName.paymentMethodsCardSecurityCodeEntered,
      CheckoutEventsName.paymentMethodsCardNameInitiated,
      CheckoutEventsName.paymentMethodsCardNameEntered,
      CheckoutEventsName.paymentMethodsCardIdentityNumberInitiated,
      CheckoutEventsName.paymentMethodsCardIdentityNumberEntered,
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
          experienceType: 'Payment vault (modal)',
        },
        stepName: 'Open the Payment Vault (modal) widget',
      },
      {
        action: 'checkout.vault.enterOtpCode',
        params: { code: '111111' },
        stepName: 'Enter an invalid OTP code',
      },
      {
        action: 'checkout.vault.clickOnContinueAsGuest',
        stepName: 'Continue as guest after the OTP rejection',
      },
      {
        // The card form remounts for the guest session; typing before that lands in the old
        // input, so no BIN lookup happens and paymentMethodsSelected is never emitted.
        action: 'analytics.events.waitForEvent',
        params: { event: CheckoutEventsName.paymentMethodsStarted },
        stepName: 'Wait for the guest payment form to mount',
      },
      {
        action: 'checkout.vault.fillFormVault',
        params: {
          creditCardData: creditCardData.stripeVisaSuccessful,
          opts: {
            avoidInstallmentsCall: true,
            type: this.config?.interactionType,
            country: 'MX',
          },
        },
        stepName: 'Fill the credit card form',
      },
      {
        action: 'checkout.vault.assertButtonEnabled',
        stepName: 'Pay button is enabled',
      },
      {
        action: 'checkout.vault.clickOnSave',
        stepName: 'Click the save card button',
      },
    ];
  }
}
