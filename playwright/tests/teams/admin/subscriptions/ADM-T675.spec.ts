import { test } from '@support/fixtures';
import { faker } from '@faker-js/faker';

import { AdminSubscriptionActions } from '@pages/admin/subscriptions/adminSubscriptionActions';

import {
  setupTestSubscriptionEnvironment,
  setupSubscription,
  type TestSetupResult,
} from '../helpers/subscriptionHelpers';
import {
  navigateToSubscriptionAndOpenPauseDialog,
  completePauseSubscription,
} from '../helpers/subscriptionActionsHelpers';

test.describe(
  '@regression DEUNA Admin - pause a subscription immediately',
  { tag: ['@admin', '@admin-preprod', '@team_admin'] },
  () => {
    let testSetup: TestSetupResult;

    test.beforeAll(async () => {
      testSetup = await setupTestSubscriptionEnvironment();
    });

    test('@ADM-T675 DEUNA Admin - pause a subscription immediately', async ({ page }) => {
      const adminSubscriptionActions = new AdminSubscriptionActions(page);

      await test.step('Setup subscription', async () => {
        await setupSubscription(
          page,
          testSetup.planName,
          testSetup.merchantId,
          testSetup.merchantToken,
          testSetup.privateKey
        );
      });

      await test.step('Navigate to subscription and pause immediately', async () => {
        await navigateToSubscriptionAndOpenPauseDialog(page);
        await completePauseSubscription(page, {
          policyOption: 'pauseImmediately',
          reason: faker.lorem.sentence({ min: 1, max: 5 }),
        });
      });

      await test.step('Assert subscription is paused', async () => {
        await adminSubscriptionActions.assertSubscriptionIsPaused();
      });
    });
  }
);
