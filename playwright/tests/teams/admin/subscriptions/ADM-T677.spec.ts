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
  '@regression DEUNA Admin - pause a subscription on specific date',
  { tag: ['@admin', '@admin-preprod', '@team_admin'] },
  async () => {
    let testSetup: TestSetupResult;

    test.beforeAll(async () => {
      testSetup = await setupTestSubscriptionEnvironment();
    });

    test('@ADM-T677 pause a subscription on specific date', async ({ page }) => {
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

      await test.step('Navigate to subscription and pause on specific date', async () => {
        const pauseDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
        await navigateToSubscriptionAndOpenPauseDialog(page);
        await completePauseSubscription(page, {
          policyOption: 'pauseAt',
          reason: faker.lorem.sentence(),
          date: pauseDate,
        });
      });

      await test.step('Assert subscription is active because it is paused in a specific date', async () => {
        await adminSubscriptionActions.assertSubscriptionIsActive();
      });
    });
  }
);
