import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { expect, test, type Page } from '@support/fixtures';
import { faker } from '@faker-js/faker';

import { AdminSubscriptionsPage } from '@pages/admin/subscriptions/adminSubscriptionsPage';
import { AdminSubscriptionActions } from '@pages/admin/subscriptions/adminSubscriptionActions';
import type { CreatePlanResponse } from '@pages/admin/subscriptions/adminSubscriptionsPlanPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { createSubscription } from '@support/newman/apiCallNewman';

export interface TestSetupResult {
  userEmail: string;
  merchantId: string;
  merchantToken: string;
  privateKey: string;
  planName: string;
}

/**
 * Sets up the basic test environment for subscription tests
 * Creates merchant, network, user, and payment processor
 * This function is reusable for pause, resume, cancel, and other subscription operations
 */
export async function setupTestSubscriptionEnvironment(): Promise<TestSetupResult> {
  const configMerchant = new ConfigMerchant();

  // Generate fresh plan name for each test
  const planName = `Plan ${faker.string.alphanumeric(4)}`;

  const { merchantId, merchantToken, privateKey } = await configMerchant.basicSetup('MX');

  const { networkId } = await apiCallNewman.createNetwork(merchantId, merchantToken);

  const userEmail = await apiCallNewman.createMerchantUserV2WithNework(
    'superadmin',
    'all',
    merchantId,
    networkId,
    merchantToken
  );

  await apiCallNewman.createPaymentProcessor(
    processorsConfig.kushkiProcessor,
    merchantId,
    merchantToken
  );

  return {
    userEmail,
    merchantId,
    merchantToken,
    privateKey,
    planName,
  };
}

/**
 * Sets up a subscription for testing
 * Creates a plan and subscription that can be used for pause, resume, cancel operations
 * This function is reusable across all subscription action tests
 */
export async function setupSubscription(
  page: Page,
  planName: string,
  merchantId: string,
  merchantToken: string,
  privateKey: string
): Promise<CreatePlanResponse> {
  const adminLoginPage = new AdminLoginPage(page);
  const adminHomePage = new AdminHomePage(page);
  const adminSubscriptionsPage = new AdminSubscriptionsPage(page);
  let plan: CreatePlanResponse;

  await test.step('Admin user logs in', async () => {
    await adminLoginPage.gotoAdmin();
    await adminHomePage.setMerchantIdSessionStorage(merchantId);
  });

  await test.step('Admin user goes to subscriptions section from sidebar', async () => {
    await adminHomePage.goToSubscriptions();
  });

  await test.step('Admin user create a plan', async () => {
    plan = await adminSubscriptionsPage.createPlan(planName);
    expect(plan).toBeTruthy();
    expect(plan.currency).toBeDefined();
    test.info().annotations.push({ type: 'plan_id', description: plan.plan_id });
  });

  await test.step('Admin user must be able to see a subscription plan in the plans table', async () => {
    await adminSubscriptionsPage.assertPlanCreatedByTable(planName);
  });

  await test.step('Create a subscription with the plan created using Newman', async () => {
    const subscription = await createSubscription(
      {
        planId: plan.plan_id,
        currency: plan.currency,
        privateKey,
      },
      merchantId,
      merchantToken
    );

    expect(subscription).toBeTruthy();
    expect(subscription.id).toBeDefined();
    await page.reload();

    test.info().annotations.push({ type: 'subscription_id', description: subscription.id });
  });

  return plan;
}

/**
 * Navigates to subscription details and verifies it's active
 * This is the common starting point for pause, resume, cancel operations
 */
export async function navigateToSubscriptionDetails(page: Page): Promise<void> {
  const adminSubscriptionsPage = new AdminSubscriptionsPage(page);
  const adminSubscriptionActions = new AdminSubscriptionActions(page);

  await test.step('The subscription must be active', async () => {
    await adminSubscriptionsPage.clickTabSubscriptions();
    await adminSubscriptionsPage.assertSubscriptionsTable();
  });

  await test.step('Admin user click to subscription button details', async () => {
    await adminSubscriptionsPage.clickAtSubscriptionDetailsFromTable();
  });

  await test.step('Verify subscription details page is loaded', async () => {
    await adminSubscriptionActions.assertSubscriptionIsActive();
    await adminSubscriptionsPage.assertSubscriptionActionableInDetails();
  });
}
