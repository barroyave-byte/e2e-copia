import { test, type Page } from '@support/fixtures';
import { AdminSubscriptionsPage } from '@pages/admin/subscriptions/adminSubscriptionsPage';
import { AdminSubscriptionActions } from '@pages/admin/subscriptions/adminSubscriptionActions';

import { navigateToSubscriptionDetails } from './subscriptionHelpers';

export const PAUSE_POLICY_VALUES = {
  pauseImmediately: 'pause_immediate',
  pauseAtEndOfCycle: 'pause_at_period_end',
  pauseAt: 'pause_at',
} as const;

export interface PauseSubscriptionParams {
  policyOption: keyof typeof PAUSE_POLICY_VALUES;
  reason: string;
  date?: Date;
}

/**
 * Navigates to subscription and opens pause dialog
 * Specific implementation for pause action
 */
export async function navigateToSubscriptionAndOpenPauseDialog(page: Page): Promise<void> {
  const adminSubscriptionsPage = new AdminSubscriptionsPage(page);
  const adminSubscriptionActions = new AdminSubscriptionActions(page);

  await test.step('Navigate to subscription details', async () => {
    await navigateToSubscriptionDetails(page);
  });

  await test.step('Admin user click to actionable button and click pause button', async () => {
    await adminSubscriptionsPage.clickSubscriptionActionablePause();
  });

  await test.step('A dialog to pause subscription should be open', async () => {
    await adminSubscriptionActions.assertDialogPauseSubscription();
  });
}

/**
 * Completes the pause subscription process
 * Fills form and submits pause request
 */
export async function completePauseSubscription(
  page: Page,
  options: PauseSubscriptionParams
): Promise<void> {
  const adminSubscriptionActions = new AdminSubscriptionActions(page);
  const policyOptionValue = PAUSE_POLICY_VALUES[options.policyOption];

  const formOptions = {
    ...options,
    policyOption: policyOptionValue,
  };

  await test.step(`Fill pause subscription form and select pause type: ${options.policyOption}`, async () => {
    await adminSubscriptionActions.fillPauseSubscriptionDialogForm(formOptions);
  });

  await test.step('Click pause button into dialog', async () => {
    await adminSubscriptionActions.clickPauseButtonIntoDialog();
  });

  await test.step('Wait to subscription be paused and close dialog', async () => {
    await adminSubscriptionActions.assertPauseSubscriptionDialogIsClosed();
  });
}
