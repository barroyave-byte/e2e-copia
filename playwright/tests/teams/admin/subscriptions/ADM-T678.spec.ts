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
  '@regression DEUNA Admin - cancel a subscription immediately',
  { tag: ['@admin', '@admin-preprod', '@team_admin'] },
  async () => {
    let testSetup: TestSetupResult;

    test.beforeAll(async () => {
      testSetup = await setupTestSubscriptionEnvironment();
    });

    test('@ADM-T678 cancel a subscription immediately', async ({ page }) => {
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

      await test.step('Fill cancel subscription dialog form', async () => {
        await adminSubscriptionActions.fillCancelSubscriptionDialogForm({
          policyOption: 'cancel_immediate',
          reason: faker.lorem.sentence({ min: 1, max: 5 }),
        });
      });

      await test.step('Click cancel button into dialog', async () => {
        await adminSubscriptionActions.clickCancelButtonIntoDialog();
      });

      await test.step('Assert dialog is closed', async () => {
        await adminSubscriptionActions.assertDialogCancelSubscriptionIsClosed();
      });

      await test.step('Assert subscription is canceled', async () => {
        await adminSubscriptionActions.assertSubscriptionIsCanceled();
      });
    });
  }
);
