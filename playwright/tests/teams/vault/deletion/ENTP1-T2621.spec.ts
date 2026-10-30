import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';

import { FIRST_CARD, SECOND_CARD, SavedCardsFlow } from './share/savedCardsFlow';

const flow = new SavedCardsFlow(true);

test.describe(
  '@regression Elements - Vault | Subscription guard when the lookup fails',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    test(
      '@ENTP1-T2621 Elements - Vault | Subscription guard: a failed lookup blocks only the affected card',
      { tag: ['@vault_card_deletion', '@team_enterprise'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            ...flow.setupSteps(),
            {
              action: 'setup.user.getCardId',
              params: { cardNumber: FIRST_CARD.number },
              saveAs: 'unverifiableCardId',
            },
            {
              action: 'checkout.vault.stubSubscriptionLookups',
              params: { failingCardId: ref('unverifiableCardId') },
              stepName: 'Break the subscriptions lookup for one card only',
            },
            ...flow.openSavedCardsList(),
            {
              action: 'checkout.vault.assertDeleteOptionNotOffered',
              params: { cardNumber: FIRST_CARD.number },
              stepName: 'The unverifiable card is withheld instead of assumed deletable',
            },
            {
              action: 'checkout.vault.setCardAsDefault',
              params: { cardNumber: FIRST_CARD.number },
              stepName: 'Make it the default card, leaving its menu with no entries',
            },
            {
              action: 'checkout.vault.assertCardHasNoActions',
              params: { cardNumber: FIRST_CARD.number },
              stepName: 'With no entries left, the card offers no menu at all',
            },
            {
              action: 'checkout.vault.deleteCard',
              params: { cardNumber: SECOND_CARD.number },
              stepName: 'The card that was verified is unaffected and can be deleted',
            },
            {
              action: 'checkout.vault.assertSelectedCardDeletionBlocked',
              params: { reason: 'unverified' },
              stepName: 'The unverifiable card stays withheld on the single-card view',
            },
          ],
          cleanup: flow.cleanupSteps(),
        });
      }
    );
  }
);
