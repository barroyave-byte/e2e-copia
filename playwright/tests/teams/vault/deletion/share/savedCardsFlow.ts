import { FlowSteps, ref } from 'playwright/framework/core';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as userAddress from '@support/interfaces/address_user';
import * as userData from '@support/interfaces/user_data';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';

/**
 * Saved cards start without a default one, as ENTP1-T2135 exercises. A spec that
 * needs one establishes it with `checkout.vault.setCardAsDefault`: only the
 * default card can end up with an empty actions menu.
 */
export const FIRST_CARD = creditCardData.kushkiVisaSuccessfull;
export const SECOND_CARD = creditCardData.kushkiMasterCardExitosa;

/**
 * Provisioning shared by the card-deletion specs: a merchant whose Vault shows
 * saved cards, and an authenticated shopper with two of them. An undefined
 * `allowCardDeletion` is left out of the config, as a merchant that never
 * configured the flag has it.
 */
export class SavedCardsFlow {
  constructor(private readonly allowCardDeletion?: boolean) {}

  setupSteps(): FlowSteps {
    return [
      { action: 'setup.merchant.basicSetup', params: { country: 'MX' } },
      {
        action: 'setup.processor.createProcessor',
        params: { processorConfig: processorsConfig.kushkiProcessor },
        saveAs: 'processorId',
      },
      { action: 'setup.order.createOrder', params: { country: 'MX' } },
      { action: 'setup.user.register' },
      {
        // Before saving any card: this also creates the merchant's network, and
        // without it /users/generate rejects the card with a 422.
        action: 'setup.checkout.configureVaultWidget',
        params: {
          config: {
            widgets_general_config: {
              ...widgetsGeneralConfig,
              user_experience: {
                show_saved_cards_flow: true,
                ...(this.allowCardDeletion === undefined
                  ? {}
                  : { allow_card_deletion: this.allowCardDeletion }),
              },
            },
            elementsConfig: {
              init_with_guest_user: false,
              user_authentication_flow: true,
            },
          },
        },
      },
      {
        action: 'setup.user.saveCreditCard',
        params: {
          creditCard: FIRST_CARD,
          address: userAddress.userAddressCreditCardMX,
          userData: userData.userDataMX,
        },
        stepName: 'Save the first card',
      },
      {
        action: 'setup.user.saveCreditCard',
        params: {
          creditCard: SECOND_CARD,
          address: userAddress.userAddressCreditCardMX,
          userData: userData.userDataMX,
        },
        stepName: 'Save the second card',
      },
      { action: 'setup.user.login' },
    ];
  }

  /** Removes the processor this flow provisioned, so the merchant is left clean. */
  cleanupSteps(): FlowSteps {
    return [
      {
        action: 'setup.processor.deleteProcessor',
        params: { processorId: ref('processorId') },
      },
    ];
  }

  openSavedCardsList(): FlowSteps {
    return [
      {
        action: 'checkout.openCheckout',
        params: { experienceType: 'Payment Vault (Web SDK)' },
      },
      { action: 'checkout.vault.assertVaultVisible' },
      { action: 'checkout.vault.seeMoreCards' },
    ];
  }
}
