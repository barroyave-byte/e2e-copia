import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';

import { FIRST_CARD, SECOND_CARD, SavedCardsFlow } from './share/savedCardsFlow';

const flow = new SavedCardsFlow();

test.describe(
  '@regression Elements - Vault | Card deletion with allow_card_deletion unconfigured',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    test(
      '@ENTP1-T2618 Elements - Vault | allow_card_deletion absent: delete controls behave as today',
      { tag: ['@vault_card_deletion', '@team_enterprise'] },
      async ({ page }) => {
        const testing = new TestingFramework({ page, test });

        await testing.run({
          step: [
            ...flow.setupSteps(),
            ...flow.openSavedCardsList(),
            {
              action: 'checkout.vault.deleteCard',
              params: { cardNumber: SECOND_CARD.number },
              stepName: 'Delete one of the saved cards from the list',
            },
            {
              action: 'checkout.vault.assertSavedCardIsVisible',
              params: { expectedCardNumbers: `**** ${FIRST_CARD.number.slice(-4)}` },
              stepName: 'Only the other card is left, on the single-card view',
            },
            {
              action: 'checkout.vault.assertSelectedCardDeletionOffered',
              stepName: 'The remaining card still offers deletion',
            },
          ],
          cleanup: flow.cleanupSteps(),
        });
      }
    );
  }
);
