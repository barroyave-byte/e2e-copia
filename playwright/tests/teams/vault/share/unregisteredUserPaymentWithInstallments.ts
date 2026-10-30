import { FlowSteps } from 'playwright/framework/core';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutEventsName, VaultEventsName } from '@tests/events/checkoutEventsName';
import { InstallmentQuantity } from '@support/interfaces/installmentsQuantity';
import { EmailGenerator } from '@support/utils/EmailGenerator';

interface Configurations {
  interactionType?: 'fill' | 'press';
}

const configMerchantVault = new ConfigMerchant();
const userEmail = EmailGenerator.generateRegisteredUserEmail();
const INSTALLMENTS: InstallmentQuantity = '3';

export class UnregisteredUserPaymentWithInstallments {
  /** Tokenized in `globalSetup`, handed to the steps that open the order. */
  private orderToken: string;

  config: Configurations;
  private privateKey: string;
  private publicKey: string;
  constructor(config: Configurations) {
    this.config = config;
  }

  globalSetup() {
    test.beforeAll(async ({ emaService }) => {
      const merchantSetup = await configMerchantVault.basicSetup('CO');
      const { merchantId, merchantToken } = merchantSetup;
      this.privateKey = merchantSetup.privateKey;
      this.publicKey = merchantSetup.publicKey;
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken);
      this.orderToken = (
        await emaService.tokenizeDeunaNowOrder('CO', this.privateKey, {
          user_email: userEmail,
          amount: 250000,
        })
      ).data.token;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.globalpayProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createCampaignMSI('COP', merchantId, merchantToken);
    });
  }

  sequenceEvents() {
    return [
      CheckoutEventsName.checkoutStarted,
      CheckoutEventsName.paymentMethodsStarted,
      CheckoutEventsName.paymentMethodsEntered,
      CheckoutEventsName.paymentMethodsCardNumberInitiated,
      CheckoutEventsName.onInstallmentSelected,
      CheckoutEventsName.paymentMethodsCardNumberEntered,
      CheckoutEventsName.paymentMethodsCardExpirationDateInitiated,
      CheckoutEventsName.paymentMethodsCardExpirationDateEntered,
      CheckoutEventsName.paymentMethodsCardSecurityCodeInitiated,
      CheckoutEventsName.paymentMethodsCardSecurityCodeEntered,
      CheckoutEventsName.paymentMethodsCardNameInitiated,
      CheckoutEventsName.paymentMethodsCardNameEntered,
      CheckoutEventsName.paymentMethodsCardIdentityNumberInitiated,
      CheckoutEventsName.paymentMethodsCardIdentityNumberEntered,
      CheckoutEventsName.onInstallmentSelected,
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
        action: 'checkout.vault.assertUserSeeTermsAndConditions',
        stepName: 'User sees terms and conditions and privacy policy',
      },
      {
        action: 'checkout.vault.fillFormVault',
        params: {
          creditCardData: creditCardData.globalpayVisaSuccessful,
          opts: { type: this.config.interactionType, country: 'CO' },
        },
        stepName: 'Fill the credit card form',
      },
      {
        action: 'checkout.vault.assertButtonEnabled',
        stepName: 'Pay button is enabled',
      },
      {
        action: 'checkout.vault.selectInstallmentsMSI',
        params: { installments: INSTALLMENTS },
        stepName: 'User selects MSI installments',
      },
      {
        action: 'checkout.vault.clickOnPay',
        stepName: 'User clicks pay',
      },
      {
        action: 'checkout.vault.assertCardRequest',
        stepName: 'Card creation request returns 201 and card id is stored',
      },
      {
        action: 'checkout.vault.assertPurchaseSendInstallmentObject',
        stepName: 'Purchase request payload includes the installment object',
      },
      {
        action: 'checkout.vault.assertPurchaseSendProperPlanOptionId',
        params: { installments: INSTALLMENTS },
        stepName: 'Purchase request payload uses the proper plan_option_id',
      },
      {
        action: 'checkout.vault.assertOrderStatusRequestPurchaseV2',
        params: { status: 'processed', statusCode: 200, useStoredCardId: true },
        stepName: 'Purchase V2 returns processed using the stored card id',
      },
      {
        action: 'checkout.vault.assertTransactionPaymentStatus',
        params: { orderToken: this.orderToken, status: 'processed', privateKey: this.privateKey },
        stepName: 'Transaction payment status is processed',
      },
    ];
  }
}
