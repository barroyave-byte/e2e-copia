import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';

import { FIRST_CARD, SECOND_CARD, SavedCardsFlow } from './share/savedCardsFlow';

const flow = new SavedCardsFlow(false);

test.describe(
  '@regression Elements - Vault | Card deletion disabled by the merchant',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    test(
      '@ENTP1-T2619 Elements - Vault | allow_card_deletion false: no delete option on any card',
      { tag: ['@vault_card_deletion', '@team_enterprise'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            ...flow.setupSteps(),
            ...flow.openSavedCardsList(),
            {
              action: 'checkout.vault.assertDeleteOptionNotOffered',
              params: { cardNumber: SECOND_CARD.number },
              stepName: 'A card keeps its menu, without the delete entry',
            },
            {
              action: 'checkout.vault.setCardAsDefault',
              params: { cardNumber: FIRST_CARD.number },
              stepName: 'Make the other card the default one',
            },
            {
              action: 'checkout.vault.assertCardHasNoActions',
              params: { cardNumber: FIRST_CARD.number },
              stepName: 'The default card offers nothing: it cannot be deleted nor set as default',
            },
          ],
          cleanup: flow.cleanupSteps(),
        });
      }
    );
  }
);
