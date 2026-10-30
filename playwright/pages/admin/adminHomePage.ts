import { expect, Locator, Page } from '@playwright/test';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import envConfig from '@support/envConfig';
import { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { RESOURCES } from './constants/rolesAndPermissions';
import { CommonsActions } from '@pages/commonActions';

type BatchAction = 'refund' | 'void' | 'capture';
// Wired to admin-ff's FilterBar via dataTestIdScope={DATA_TEST_ID.FILTERS} (BatchProcessing.tsx).
const BATCH_ACTION_FILTER_TRIGGER = 'batch-processing-filters-filter-bar-filter-operationType';
const batchActionOption = (action: BatchAction) =>
  `${BATCH_ACTION_FILTER_TRIGGER}-option-${action}`;

const urlAdmin = envConfig.ADMIN_URL;

export class AdminHomePage extends CommonsActions {
  readonly selectors: AdminTranslations;
  readonly page: Page;

  readonly labelTitleConnections: Locator;
  readonly labelTitlePaymentStrategy: Locator;
  readonly labelTitleCommerce: Locator;
  readonly labelTitleErrorManagement: Locator;
  readonly labelTitleOrders: Locator;
  readonly labelTitleReports: Locator;
  readonly labelTitleRolesAndPermissions: Locator;
  readonly labelTitleMetrics: Locator;
  readonly labelTitleInstallments: Locator;
  readonly labelTitlePaymentLink: Locator;
  readonly labelTitleReconciliations: Locator;

  readonly buttonConnections: Locator;
  readonly buttonPaymentStrategy: Locator;
  readonly buttonCommerce: Locator;
  readonly tabCommerceSecurity: Locator;
  readonly buttonErrorManagement: Locator;
  readonly buttonOrders: Locator;
  readonly buttonReports: Locator;
  readonly buttonRolesAndPermissions: Locator;
  readonly buttonMetrics: Locator;
  readonly buttonInstallments: Locator;
  readonly buttonBatchProcessing: Locator;
  readonly buttonPaymentLink: Locator;
  readonly buttonReconciliations: Locator;
  readonly buttonLogs: Locator;

  readonly menuSettingBtn: Locator;
  readonly menuMyDataBtn: Locator;
  readonly logoutBtn: Locator;
  readonly unexpectedApplicationErrorText: Locator;
  readonly buttonNotification: Locator;
  readonly buttonViewAllNotifications: Locator;
  readonly labelNotifications: Locator;
  readonly selectorAction: Locator;
  readonly buttonSubscriptions: Locator;
  readonly merchantSelector: Locator;
  readonly searchMerchantInput: Locator;

  //Locators
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('admin', languageCode);
    // Sidebar button locators — scoped to the desktop rail. AppShell also
    // mounts the same nav items in the off-canvas mobile drawer.
    const sidebarRail = page.getByTestId('app-shell-sidebar-rail');
    this.buttonConnections = sidebarRail.getByTestId('sidebar-menu-connections');
    this.buttonPaymentStrategy = sidebarRail.getByTestId('sidebar-menu-payment-strategy');
    this.buttonErrorManagement = sidebarRail.getByTestId('sidebar-menu-error-management');
    this.buttonOrders = sidebarRail.getByTestId('sidebar-menu-orders');
    this.buttonReports = sidebarRail.getByTestId('sidebar-menu-reports');
    this.buttonCommerce = sidebarRail.getByTestId('sidebar-menu-commerce');
    this.tabCommerceSecurity = this.page.getByTestId('commerce-filter-tab-security');
    this.buttonRolesAndPermissions = sidebarRail.getByTestId('sidebar-menu-roles-and-permissions');
    this.buttonMetrics = sidebarRail.getByTestId('sidebar-menu-metrics');
    this.buttonInstallments = sidebarRail.getByTestId('sidebar-menu-installments-config');
    this.buttonBatchProcessing = sidebarRail.getByTestId('sidebar-menu-batch-processing');
    this.buttonPaymentLink = sidebarRail.getByTestId('sidebar-menu-payment-link');
    this.buttonSubscriptions = sidebarRail.getByTestId('sidebar-menu-subscriptions');
    this.buttonReconciliations = sidebarRail.getByTestId('sidebar-menu-conciliation');
    this.buttonLogs = sidebarRail.getByTestId('sidebar-menu-logs');
    // Section title locators
    this.labelTitleConnections = page.getByTestId('connections-title');
    this.labelTitleReconciliations = page.getByTestId('reconciliations-title');
    this.labelTitlePaymentStrategy = page.getByTestId('strategy-title');
    this.labelTitleCommerce = page.getByTestId('commerce-title');
    this.labelTitleOrders = page.getByTestId('orders-title');
    this.labelTitleReports = page.getByTestId('reports-title');
    this.labelTitleErrorManagement = page.getByTestId('psp-errors-title');
    this.labelTitleMetrics = page.getByTestId('metrics-title');
    this.labelTitleInstallments = this.page.getByTestId('installments-title');
    this.labelTitleRolesAndPermissions = page.getByTestId('roles-and-permissions-title');
    this.labelTitlePaymentLink = page.getByTestId('payment-link-title');
    // Header locators
    this.menuSettingBtn = sidebarRail.getByTestId('app-shell-account-button-menu');
    this.menuMyDataBtn = page.getByTestId('app-shell-account-button-profile');
    this.logoutBtn = page.getByTestId('app-shell-account-button-logout');
    this.buttonNotification = page.getByTestId('app-shell-topbar-notification-button-trigger');
    this.buttonViewAllNotifications = page.getByTestId(
      'app-shell-topbar-notification-button-view-all'
    );
    this.labelNotifications = page.getByTestId('notifications-title');
    // Miscellaneous locators
    this.unexpectedApplicationErrorText = page.locator(
      'h2:has-text("Unexpected Application Error!")'
    );
    this.selectorAction = page.getByTestId(BATCH_ACTION_FILTER_TRIGGER);
    this.merchantSelector = sidebarRail.getByTestId('sidebar-menu-select-merchant');
    // CommerceSelector search lives in a portaled dropdown, not inside the rail.
    this.searchMerchantInput = page.getByTestId('sidebar-menu-input-search-merchant');
  }

  async clickAndVerify(element: Locator, titleLocator: Locator) {
    await expect(element).toBeVisible();
    await element.click();
    await expect(titleLocator).toBeVisible();
  }

  //Actions
  private async openSelectorAndSearch(searchTerm: string): Promise<void> {
    await expect(
      this.merchantSelector,
      'The merchant selector is not visible before opening it'
    ).toBeVisible();
    if (!(await this.searchMerchantInput.isVisible())) {
      await this.merchantSelector.click();
    }
    await expect(this.searchMerchantInput).toBeVisible();
    await this.searchMerchantInput.fill(searchTerm);
  }

  private async clickSelectorOption(testId: string): Promise<void> {
    const option = this.page.getByTestId(testId);
    await expect(option).toBeVisible();
    await option.click();
  }

  async selectMerchant(merchantName: string, merchantId: string): Promise<void> {
    await this.openSelectorAndSearch(merchantName);
    await this.clickSelectorOption(`merchant-selector-option-${merchantId}`);
  }

  async selectNetwork(networkName: string, networkId: string): Promise<void> {
    await this.openSelectorAndSearch(networkName);
    await this.clickSelectorOption(`merchant-selector-option-${networkId}`);
  }

  async setMerchantIdSessionStorage(merchantId: string) {
    await this.setMerchantSessionStorage(merchantId);
  }

  async scrollToButtonConnections() {
    await this.buttonConnections.scrollIntoViewIfNeeded();
  }

  async goToConnections() {
    await this.clickAndVerify(this.buttonConnections, this.labelTitleConnections);
  }

  // this button render depends on statsig dynamic config and the user permissions
  // multiple attempts are allowed to ensure that the button is visible
  async goToReconciliations() {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        await expect(this.buttonReconciliations).toBeVisible();
        await this.buttonReconciliations.click();
        await expect(this.labelTitleReconciliations).toBeVisible();
        break; // Exit loop if successful
      } catch (error) {
        await this.page.waitForTimeout(3000);
        await this.page.reload();
        attempts++;
        console.log(`Attempt ${attempts} failed to find reconciliations button. Retrying...`);
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to find reconciliations button after ${maxAttempts} attempts`);
        }
      }
    }
  }

  async goToPaymentStrategy() {
    await expect(this.buttonPaymentStrategy).toBeVisible();
    await this.buttonPaymentStrategy.click();
    await this.page.waitForURL(/\/strategy\/?$/);
    await this.page.waitForTimeout(1000); //This waiting and reload is for ensure that Edit button not always is "active" most time is "draft"
    await this.page.reload();
    await expect(this.labelTitlePaymentStrategy).toBeVisible();
  }

  async goToCommerce() {
    await this.clickAndVerify(this.buttonCommerce, this.labelTitleCommerce);
  }

  async navigateToSecuritySettings() {
    await expect(this.tabCommerceSecurity).toBeVisible();
    await this.tabCommerceSecurity.click();
  }

  async goToErrorManagement() {
    await this.clickAndVerify(this.buttonErrorManagement, this.labelTitleErrorManagement);
  }

  async goToMetrics() {
    await this.clickAndVerify(this.buttonMetrics, this.labelTitleMetrics);
  }

  async goToOrders() {
    await this.clickAndVerify(this.buttonOrders, this.labelTitleOrders);
  }

  async goToReports() {
    await this.clickAndVerify(this.buttonReports, this.labelTitleReports);
  }

  async goToInstallments() {
    await this.clickAndVerify(this.buttonInstallments, this.labelTitleInstallments);
  }

  async clickToMenuMyData() {
    await expect(this.menuMyDataBtn).toBeVisible();
    await this.menuMyDataBtn.click();
  }

  async goToNotifications() {
    await expect(this.buttonViewAllNotifications).toBeVisible();
    await this.buttonViewAllNotifications.click();
    await expect(this.labelNotifications).toBeVisible();
  }

  async goToRolesAndPermissions() {
    await this.clickAndVerify(this.buttonRolesAndPermissions, this.labelTitleRolesAndPermissions);
  }

  async goToPaymentLink() {
    await this.clickAndVerify(this.buttonPaymentLink, this.labelTitlePaymentLink);
  }

  async goToSubscriptions() {
    await expect(this.buttonSubscriptions).toBeVisible();
    await this.buttonSubscriptions.click();
    await this.page.waitForURL(`${urlAdmin}/subscriptions`);
  }

  async clickNotificationsButton() {
    await expect(this.buttonNotification).toBeVisible();
    await this.buttonNotification.click();
  }

  async clickToMenuSettings() {
    await this.clickAndVerify(this.menuSettingBtn, this.logoutBtn);
  }

  async logout() {
    await this.logoutBtn.click();
  }

  //Assertions:
  async unexpectedApplicationErrorToBeHidden() {
    await expect(this.unexpectedApplicationErrorText).toBeHidden();
  }

  async assertAdminHomePageAsCurrentPage(): Promise<void> {
    console.log('Validating user is in admin home page');
    await this.page.waitForURL(`${urlAdmin}/orders`);
    await expect(this.page).toHaveURL(`${urlAdmin}/orders`);
  }

  async assertPaymentStrategyIsCurrentPage(): Promise<void> {
    console.log('Validating user is in payment strategy page');
    await expect(this.page).toHaveURL(/\/strategy\/?$/);
  }

  async assertReconciliationsIsCurrentPage(): Promise<void> {
    console.log('Validating user is in reconciliations page');
    await this.page.waitForURL(`${urlAdmin}/reconciliations`);
    await expect(this.page).toHaveURL(`${urlAdmin}/reconciliations`);
  }

  async assertConnectionsIsCurrentPage(): Promise<void> {
    console.log('Validating user is in connections page');
    await this.page.waitForURL(`${urlAdmin}/connections`);
    await expect(this.page).toHaveURL(`${urlAdmin}/connections`);
  }

  async goToBatchProcessing() {
    await this.buttonBatchProcessing.click();
  }

  async filterByAction(action: BatchAction) {
    const menuAction = this.page.getByTestId(batchActionOption(action));
    await this.selectorAction.click();

    await expect(menuAction)
      .toBeVisible()
      .then(() => menuAction.click());

    const cellAction = this.page.getByTestId(
      `batch-processing-chip-batch-processing-cell-operation-type-${action}`
    );

    await expect(cellAction).toBeVisible();
  }

  async assertVisibleModulesAccordingToPermissions(permissions: string[]): Promise<void> {
    const permissionSet = new Set(permissions);

    const permissionToButtonMap: Record<string, Locator> = {
      [RESOURCES.connections]: this.buttonConnections,
      [RESOURCES.routing]: this.buttonPaymentStrategy,
      [RESOURCES.errorManagement]: this.buttonErrorManagement,
      [RESOURCES.orders]: this.buttonOrders,
      [RESOURCES.reports]: this.buttonReports,
      [RESOURCES.commerce]: this.buttonCommerce,
      [RESOURCES.rolesAndPermissions]: this.buttonRolesAndPermissions,
      [RESOURCES.metrics]: this.buttonMetrics,
      [RESOURCES.installments]: this.buttonInstallments,
      [RESOURCES.batchProcessing]: this.buttonBatchProcessing,
      [RESOURCES.paymentLink]: this.buttonPaymentLink,
      [RESOURCES.subscriptions]: this.buttonSubscriptions,
    };

    for await (const [resourceValue, button] of Object.entries(permissionToButtonMap)) {
      if (permissionSet.has(resourceValue)) {
        await expect(
          button,
          `Expected button for permission ${resourceValue} to be visible`
        ).toBeVisible();
      } else {
        await expect(
          button,
          `Expected button for permission ${resourceValue} to be hidden`
        ).toBeHidden();
      }
    }
  }

  async assertNavigationButtonVisibility(
    buttonLocator: Locator,
    shouldBeVisible: boolean
  ): Promise<void> {
    if (shouldBeVisible) {
      await expect(buttonLocator).toBeVisible({ timeout: 5000 });
    } else {
      await expect(buttonLocator).not.toBeVisible({ timeout: 5000 });
    }
  }
}
