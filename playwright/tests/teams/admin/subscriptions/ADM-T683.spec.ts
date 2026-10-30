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
  '@regression DEUNA Admin - reactivate a subscription after specific date',
  { tag: ['@admin', '@admin-preprod', '@team_admin'] },
  async () => {
    let testSetup: TestSetupResult;

    test.beforeAll(async () => {
      testSetup = await setupTestSubscriptionEnvironment();
    });

    test('@ADM-T683 reactivate a subscription after specific date', async ({ page }) => {
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

      await test.step('Pause subscription immediately to reactivate it after specific date', async () => {
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

      await test.step('Assert to reactivate dialog is opened', async () => {
        await adminSubscriptionActions.assertDialogResumeSubscription();
      });

      await test.step('Fill reactivate subscription dialog form', async () => {
        const reactivateDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
        await adminSubscriptionActions.fillResumeSubscriptionDialogForm({
          policyOption: 'resume_at',
          date: reactivateDate,
        });
      });

      await test.step('Click resume button into dialog', async () => {
        await adminSubscriptionActions.clickResumeButtonIntoDialog();
      });

      await test.step('Assert dialog is closed', async () => {
        await adminSubscriptionActions.assertDialogResumeSubscriptionIsClosed();
      });

      await test.step('Assert subscription remains paused until the scheduled date', async () => {
        await adminSubscriptionActions.assertSubscriptionIsPaused();
      });
    });
  }
);
