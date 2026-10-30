import { FlowSteps } from 'playwright/framework/core';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutEventsName, VaultEventsName } from '@tests/events/checkoutEventsName';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { THEME_FULL_CONFIG } from '@support/http/testData/checkout_configuration/CheckoutThemeConfig';

const configMerchantVault = new ConfigMerchant();
const themeName = 'CustomStyleE2E';

interface Configurations {
  interactionType?: 'fill' | 'press';
}

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
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

export class GuestUserSeesTags {
  /** Tokenized in `globalSetup`, handed to the steps that open the order. */
  private orderToken: string;
  private privateKey: string;
  private publicKey: string;

  config: Configurations;
  private themeData: any;

  constructor(config: Configurations) {
    this.config = config;
  }

  globalSetup() {
    test.beforeAll(async () => {
      const merchantSetup = await configMerchantVault.basicSetup('MX');
      const { merchantId, merchantToken } = merchantSetup;
      this.privateKey = merchantSetup.privateKey;
      this.publicKey = merchantSetup.publicKey;

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);

      const checkoutConfigurationService = ServiceFactory.getService(
        SERVICE_KEYS.CHECKOUT_CONFIGURATION
      );
      const response = await checkoutConfigurationService.createTheme(
        this.privateKey,
        themeName,
        THEME_FULL_CONFIG
      );
      this.themeData = response.data;
      const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
      this.orderToken = (
        await emaService.tokenizeDeunaNowOrder('MX', this.privateKey, {
          billing_first_name: '',
          billing_last_name: '',
        })
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
      CheckoutEventsName.tagShown,
      CheckoutEventsName.paymentMethodsStarted,
      CheckoutEventsName.paymentMethodsSelected,
      CheckoutEventsName.tagShown,
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
      CheckoutEventsName.billingStarted,
      CheckoutEventsName.billingFormSave,
      CheckoutEventsName.tagShown,
      CheckoutEventsName.tagShown,
      VaultEventsName.vaultSaveClick,
      CheckoutEventsName.paymentProcessing,
    ];
  }

  flowSteps(): FlowSteps {
    const cardTitle =
      this.themeData.config.PaymentMethodsPattern.translations.es.paymentMethods.info.card.title;
    const upperTagTitle = this.themeData.config.UpperTagPattern.title;
    const upperTagDescription = this.themeData.config.UpperTagPattern.description;

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
        params: { method: 'Payment Vault (Web SDK External Button)' },
        stepName: 'Select Payment Vault (Web SDK External Button) as the payment method',
      },
      {
        action: 'payment.page.clickOnPayButtonEmbedded',
        stepName: 'Open the embedded vault widget',
      },
      {
        action: 'checkout.vault.fillFormVault',
        params: {
          creditCardData: creditCardData.stripeVisaSuccessful,
          opts: { country: 'MX', type: this.config.interactionType },
        },
        stepName: 'Fill the credit card form',
      },
      {
        action: 'checkout.vault.showBillingFormIFrame',
        stepName: 'Open the billing form drawer',
      },
      {
        action: 'checkout.vault.fillNameBillingForm',
        params: { name: 'John Doe' },
        stepName: 'Fill the billing form first name',
      },
      {
        action: 'checkout.vault.clickSaveBillingForm',
        stepName: 'Save the billing form',
      },
      {
        action: 'checkout.vault.assertTextVisibleInIframe',
        params: { text: cardTitle },
        stepName: 'Custom payment methods card title is visible in the iframe',
      },
      {
        action: 'checkout.vault.assertTextVisibleInIframe',
        params: { text: upperTagTitle, matchFirst: false },
        stepName: 'Custom upper tag title is visible in the iframe',
      },
      {
        action: 'checkout.vault.assertTextVisibleInIframe',
        params: { text: upperTagDescription },
        stepName: 'Custom upper tag description is visible in the iframe',
      },
      {
        action: 'payment.page.clickOnPayButtonSummaryWithOutTransaction',
        stepName: 'Verify order information by clicking summary pay',
      },
    ];
  }
}
