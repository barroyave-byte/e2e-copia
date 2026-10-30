import { FlowSteps } from 'playwright/framework/core';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userData from '@support/interfaces/user_data';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { CheckoutEventsName, VaultEventsName } from '@tests/events/checkoutEventsName';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const userEmail = EmailGenerator.generateRegisteredUserEmail();

interface Configurations {
  interactionType?: 'fill' | 'press';
}

const generalWidgetConfig = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
  elementsConfig: {
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

export class UserAuthenticatedBySmsChannelAndPaymentFlow {
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
          identity_document: creditCardData.stripeVisaSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: this.privateKey,
        }
      );

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);

      await apiCallNewman.setCreditCardForUserInNetwork(
        userEmail,
        creditCardData.stripeVisaSuccessful,
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
      CheckoutEventsName.loginOtpCodeExpired,
      CheckoutEventsName.loginOtpSendSms,
      CheckoutEventsName.login,
      CheckoutEventsName.loginOtpAccepted,
      CheckoutEventsName.paymentMethodsStarted,
      CheckoutEventsName.paymentMethodsCardSelected,
      CheckoutEventsName.paymentMethodsEntered,
      CheckoutEventsName.paymentMethodsCardSecurityCodeInitiated,
      CheckoutEventsName.paymentMethodsCardSecurityCodeEntered,
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
        action: 'core.timing.wait',
        params: { milliseconds: 60000 },
        stepName: 'Wait for the OTP code to expire',
      },
      {
        action: 'checkout.vault.resendOtpCodeToChannel',
        stepName: 'Change channel and request a new OTP after expiration',
      },
      {
        action: 'core.timing.wait',
        params: { milliseconds: 1000 },
        stepName: 'Wait briefly for the new OTP screen to settle',
      },
      {
        action: 'checkout.vault.enterOtpCode',
        stepName: 'Enter the valid OTP code',
      },
      {
        action: 'checkout.vault.fillCvvInCardForm',
        params: {
          cvv: creditCardData.globalpayVisaSuccessful.cvv_code,
          type: this.config.interactionType,
          avoidInstallmentsCall: true,
        },
        stepName: 'Fill the card CVV input',
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
    ];
  }
}
