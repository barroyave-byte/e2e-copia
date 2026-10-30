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
  '@regression DEUNA Admin - pause a subscription at end of cycle',
  { tag: ['@admin', '@admin-preprod', '@team_admin'] },
  async () => {
    let testSetup: TestSetupResult;

    test.beforeAll(async () => {
      testSetup = await setupTestSubscriptionEnvironment();
    });

    test('@ADM-T676 pause a subscription at end of cycle', async ({ page }) => {
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

      await test.step('Navigate to subscription and pause at end of cycle', async () => {
        await navigateToSubscriptionAndOpenPauseDialog(page);
        await completePauseSubscription(page, {
          policyOption: 'pauseAtEndOfCycle',
          reason: faker.lorem.sentence(),
        });
      });

      await test.step('Assert subscription is active because it is paused at the end of the cycle', async () => {
        await adminSubscriptionActions.assertSubscriptionIsActive();
      });
    });
  }
);
