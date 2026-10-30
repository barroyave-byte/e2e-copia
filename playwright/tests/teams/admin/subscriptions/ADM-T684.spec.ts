import { test } from '@support/fixtures';
import { faker } from '@faker-js/faker';

import { AdminSubscriptionActions } from '@pages/admin/subscriptions/adminSubscriptionActions';
import { AdminSubscriptionsPage } from '@pages/admin/subscriptions/adminSubscriptionsPage';

import {
  setupSubscription,
  setupTestSubscriptionEnvironment,
  type TestSetupResult,
} from '../helpers/subscriptionHelpers';
import {
  completePauseSubscription,
  navigateToSubscriptionAndOpenPauseDialog,
} from '../helpers/subscriptionActionsHelpers';

test.describe(
  '@regression DEUNA Admin - reactivate a subscription at end of cycle',
  { tag: ['@admin', '@admin-preprod', '@team_admin'] },
  async () => {
    let testSetup: TestSetupResult;

    test.beforeAll(async () => {
      testSetup = await setupTestSubscriptionEnvironment();
    });

    test('@ADM-T684 reactivate a subscription at end of cycle', async ({ page }) => {
      const adminSubscriptionActions = new AdminSubscriptionActions(page);
      const adminSubscriptionsPage = new AdminSubscriptionsPage(page);

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
      });

      await test.step('Pause subscription immediately to reactivate it at end of cycle', async () => {
        await completePauseSubscription(page, {
          policyOption: 'pauseImmediately',
          reason: faker.lorem.sentence(),
        });
      });

      await test.step('Assert subscription is paused', async () => {
        await adminSubscriptionActions.assertSubscriptionIsPaused();
      });

      await test.step('Click on reactivate button in subscription details', async () => {
        await adminSubscriptionsPage.assertSubscriptionActionableInDetails();
        await adminSubscriptionsPage.clickSubscriptionActionableReactivate();
      });

      await test.step('Assert to resume dialog is opened', async () => {
        await adminSubscriptionActions.assertDialogResumeSubscription();
      });

      await test.step('Fill resume subscription dialog form', async () => {
        await adminSubscriptionActions.fillResumeSubscriptionDialogForm({
          policyOption: 'resume_at_period_end',
        });
      });

      await test.step('Click resume button into dialog', async () => {
        await adminSubscriptionActions.clickResumeButtonIntoDialog();
      });

      await test.step('Assert dialog is closed', async () => {
        await adminSubscriptionActions.assertDialogResumeSubscriptionIsClosed();
      });

      await test.step('Assert subscription remains paused until the cycle ends', async () => {
        await adminSubscriptionActions.assertSubscriptionIsPaused();
      });
    });
  }
);
