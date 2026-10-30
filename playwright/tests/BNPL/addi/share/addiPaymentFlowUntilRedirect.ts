import { FlowSteps } from 'playwright/framework/core';
import { test } from '@support/fixtures';
import { addiProcessor } from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export class AddiPaymentFlowUntilRedirect {
  /** Tokenized in `globalSetup`, handed to the steps that open the order. */
  private orderToken: string;
  private privateKey: string;
  private publicKey: string;

  globalSetup() {
    test.beforeAll(async ({ emaService }) => {
      const configMerchantCheckout = new ConfigMerchantCheckout();
      const merchantSetup = await configMerchantCheckout.basicSetup('CO');
      const { merchantId, merchantName, merchantToken } = merchantSetup;
      this.privateKey = merchantSetup.privateKey;
      this.publicKey = merchantSetup.publicKey;
      await apiCallNewman.createPaymentProcessor(addiProcessor, merchantId, merchantToken);
      this.orderToken = (
        await emaService.tokenizeDeunaNowOrder('CO', this.privateKey, { amount: 7980000 })
      ).data.token;
    });
  }

  sequenceEvents() {
    return [
      CheckoutEventsName.checkoutStarted,
      CheckoutEventsName.paymentMethodsStarted,
      CheckoutEventsName.paymentMethodsSelected,
      CheckoutEventsName.paymentMethodsEntered,
      CheckoutEventsName.paymentClick,
      CheckoutEventsName.paymentProcessing,
    ];
  }

  flowSteps(): FlowSteps {
    return [
      {
        action: 'checkout.bnpl.addi.injectMobileBridge',
        stepName: 'Inject the Android WebView mobile bridge before navigation',
      },
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
        action: 'checkout.bnpl.addi.selectAddiForm',
        stepName: 'Select Addi as the payment method',
      },
      {
        action: 'checkout.bnpl.addi.waitRemoteTranslations',
        params: { projectName: 'checkout_modular_loading_view', lang: 'es' },
        stepName: 'Register watcher for the remote translations response',
      },
      {
        action: 'checkout.bnpl.addi.clickPayForm',
        stepName: 'Click pay and start watching for the Addi popup',
      },
      {
        action: 'checkout.bnpl.addi.fillReferenceModal',
        stepName: 'Fill the Addi customer reference data modal',
      },
      {
        action: 'checkout.bnpl.addi.clickReferenceModalPay',
        stepName: 'Submit the Addi reference data modal',
      },
      {
        action: 'checkout.bnpl.addi.assertRemoteTranslations',
        stepName: 'Assert the remote translations response is valid',
      },
      {
        action: 'checkout.bnpl.addi.assertAddiPopupVisible',
        stepName: 'Assert the Addi redirect popup landing page is visible',
      },
    ];
  }
}
