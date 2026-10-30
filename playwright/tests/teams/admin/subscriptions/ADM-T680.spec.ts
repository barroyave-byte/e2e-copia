import { test } from '@support/fixtures';
import { faker } from '@faker-js/faker';

import { AdminSubscriptionActions } from '@pages/admin/subscriptions/adminSubscriptionActions';
import { AdminSubscriptionsPage } from '@pages/admin/subscriptions/adminSubscriptionsPage';

import {
  navigateToSubscriptionDetails,
  setupSubscription,
  setupTestSubscriptionEnvironment,
  type TestSetupResult,
} from '../helpers/subscriptionHelpers';

test.describe(
  '@regression DEUNA Admin - cancel a subscription on specific date',
  { tag: ['@admin', '@admin-preprod', '@team_admin'] },
  async () => {
    let testSetup: TestSetupResult;

    test.beforeAll(async () => {
      testSetup = await setupTestSubscriptionEnvironment();
    });

    test('@ADM-T680 DEUNA Admin - cancel a subscription on specific date', async ({ page }) => {
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

      await test.step('Navigate to subscription details', async () => {
        await navigateToSubscriptionDetails(page);
      });

      await test.step('Click on cancel button in subscription details', async () => {
        await adminSubscriptionsPage.assertSubscriptionActionableInDetails();
        await adminSubscriptionsPage.clickSubscriptionActionableCancel();
      });

      await test.step('Assert cancel dialog is opened', async () => {
        await adminSubscriptionActions.assertDialogCancelSubscription();
      });

      await test.step('Fill cancel subscription dialog form with specific date', async () => {
        const cancelDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
        await adminSubscriptionActions.fillCancelSubscriptionDialogForm({
          policyOption: 'cancel_at',
          reason: faker.lorem.sentence({ min: 1, max: 5 }),
          date: cancelDate,
        });
      });

      await test.step('Click cancel button into dialog', async () => {
        await adminSubscriptionActions.clickCancelButtonIntoDialog();
      });

      await test.step('Assert dialog is closed', async () => {
        await adminSubscriptionActions.assertDialogCancelSubscriptionIsClosed();
      });

      await test.step('Assert subscription is active because cancellation is scheduled for future date', async () => {
        await adminSubscriptionActions.assertSubscriptionIsActive();
      });
    });
  }
);
