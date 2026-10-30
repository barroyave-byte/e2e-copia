import { test } from '@support/fixtures';
import { TestingFramework, ref } from 'playwright/framework/core';

import { FIRST_CARD, SECOND_CARD, SavedCardsFlow } from './share/savedCardsFlow';

const flow = new SavedCardsFlow(true);

test.describe(
  '@regression Elements - Vault | Subscription guard with card deletion enabled',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    test(
      '@ENTP1-T2620 Elements - Vault | Subscription guard: a card with a subscription cannot be deleted, one without it can',
      { tag: ['@vault_card_deletion', '@team_enterprise'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            ...flow.setupSteps(),
            {
              action: 'setup.user.getCardId',
              params: { cardNumber: FIRST_CARD.number },
              saveAs: 'subscribedCardId',
            },
            {
              action: 'checkout.vault.stubSubscriptionLookups',
              params: { subscribedCardId: ref('subscribedCardId') },
              stepName: 'One card has a subscription, the other does not',
            },
            ...flow.openSavedCardsList(),
            {
              action: 'checkout.vault.assertDeleteOptionNotOffered',
              params: { cardNumber: FIRST_CARD.number },
              stepName: 'The subscribed card no longer offers deletion',
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
              stepName: 'The card without a subscription is still deletable',
            },
            {
              action: 'checkout.vault.assertSelectedCardDeletionBlocked',
              params: { reason: 'blocked' },
              stepName: 'The subscribed card stays protected on the single-card view',
            },
          ],
          cleanup: flow.cleanupSteps(),
        });
      }
    );
  }
);
