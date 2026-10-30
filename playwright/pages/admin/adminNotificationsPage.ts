import { expect, Locator, Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import envConfig from '@support/envConfig';
import { retryUntil } from '@support/utils/retries';

const urlAdmin = envConfig.ADMIN_URL;

export class AdminNotificationsPage {
  readonly page: Page;
  readonly labelNotifications: Locator;
  readonly labelDisableConnection: Locator;
  readonly labelEditConnection: Locator;
  readonly labelCreateConnection: Locator;
  readonly labelCreateStrategyRule: Locator;
  readonly labelEnableFraudConnectionNotification: Locator;

  //labels
  readonly labelConectionPspNotification: Locator;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    this.page = page;
    this.labelNotifications = page.getByTestId('notifications-title');
    this.labelConectionPspNotification = page
      .locator('[data-testid^="notifications-item-"]')
      .first();
    this.labelDisableConnection = page.getByTestId('notifications-item-disableProvider').first();
    this.labelEditConnection = page.getByTestId('notifications-item-editProvider').first();
    this.labelCreateConnection = page.getByTestId('notifications-item-connectProvider').first();
    this.labelEnableFraudConnectionNotification = page
      .getByTestId('notifications-item-updateFraud')
      .first();
    this.labelCreateStrategyRule = page.getByTestId('notifications-item-createRule').first();
  }

  //Actions:

  //Assertions:
  async assertPresenceInNotifications(): Promise<void> {
    console.log('Validating notificationes presence');
    expect(this.page.url()).toBe(`${urlAdmin}/notifications`);
    expect(this.labelNotifications).toBeVisible();
  }

  async assertValidateConectionsPSPTitle(): Promise<void> {
    console.log('Validating that conection notification its ok');
    await expect(this.labelConectionPspNotification).toBeAttached({ timeout: 60_000 });
  }

  /**
   * Retry wrapper for `assertValidateConectionsPSPTitle` until it succeeds.
   * `assertValidateConectionsPSPTitle` can fail because notifications may
   * take a long time to appear.
   */
  async assertValidateConectionsPSPTitleRetry() {
    let success = false;
    await retryUntil(
      async () => {
        try {
          await this.assertValidateConectionsPSPTitle();
          success = true;
        } catch (error) {}
      },
      () => success
    );

    expect(success).toBe(true);
  }

  async assertValidateEditProcessor(): Promise<void> {
    console.log('Validating tittle edit connection');
    await expect(this.labelEditConnection).toBeVisible();
  }

  async assertValidateDisableProcessor(): Promise<void> {
    console.log('Validating tittle disable connection');
    await expect(this.labelDisableConnection).toBeVisible();
  }

  async assertValidateCreateProcessor(): Promise<void> {
    console.log('Validating tittle create connection');
    await expect(this.labelCreateConnection).toBeVisible();
  }

  async assertValidateEnableFraudConnection(): Promise<void> {
    console.log('Validating tittle enable fraud connection');
    await expect(this.labelEnableFraudConnectionNotification).toBeVisible();
  }
  async assertValidateCreateStrategyRule(): Promise<void> {
    console.log('Validating tittle create strategy rule');
    await expect(this.labelCreateStrategyRule).toBeVisible();
  }
}
