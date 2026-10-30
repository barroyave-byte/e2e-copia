import { expect, Locator, Page } from '@playwright/test';
import { AdminTranslations } from '@support/translations/selectors/admin/adminTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { LanguageCodes } from '@support/interfaces/languageCodeTypes';
import envConfig from '@support/envConfig';
import {
  ROLES_AND_PERMISSIONS_DATA_TEST_IDS,
  ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE,
  ROLES_AND_PERMISSIONS_DYNAMIC_DATA_TEST_IDS,
} from '../constants/rolesAndPermissions';
import { CommonsActions } from '@pages/commonActions';
import { retryUntil } from '@support/utils/retries';

const urlRolesAndPermissions = `${envConfig.ADMIN_URL}/roles-and-permissions`;
const urlRolesAndPermissionsRolesTab = `${urlRolesAndPermissions}/roles`;
const urlRolesAndPermissionsUsersTab = `${urlRolesAndPermissions}/users`;
const urlRolesAndPermissionsNewUser = `${urlRolesAndPermissionsUsersTab}/new-user`;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ROLES_AND_PERMISSIONS_USER_TEST_IDS = {
  EMAIL_CELL: (userEmail: string) =>
    `${ROLES_AND_PERMISSIONS_DATA_TEST_ID_SCOPE}-user-email-${userEmail.toLowerCase()}`,
} as const;

export class AdminRolesAndPermissionsPage extends CommonsActions {
  readonly page: Page;
  readonly selectors: AdminTranslations;
  // roles and permissions locators
  readonly labelTitleRolesAndPermissions: Locator;
  readonly buttonUsersTab: Locator;
  readonly buttonRolesTab: Locator;
  // role tab locators
  readonly buttonCreateRole: Locator;
  // users tab locators
  readonly buttonCreateUser: Locator;
  readonly buttonViewUserDetails: Locator;
  readonly buttonEditUser: Locator;
  readonly inputSearchUserByEmail: Locator;
  readonly inputSelectRoleBatchReassignment: Locator;
  readonly labelReassignmentDrawerTitle: Locator;
  readonly userRowByEmail: (userEmail: string) => Locator;
  readonly userActionsDropdownByEmail: (userEmail: string) => Locator;

  // Locator
  constructor(page: Page, languageCode: LanguageCodes = 'ES') {
    super(page);
    this.page = page;
    this.selectors = getTranslations('admin', languageCode);

    // Set default timeout for all assertions in this page
    this.page.setDefaultTimeout(80000);
    // roles and permissions locators
    this.labelTitleRolesAndPermissions = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.rolesAndPermissionsTitle
    );
    this.buttonRolesTab = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.rolesTab);
    this.buttonUsersTab = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.usersTab);
    // role tab locators
    this.buttonCreateRole = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.buttonCreateRole);
    // users tab locators
    this.buttonCreateUser = page.getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.buttonCreateUser);
    this.buttonViewUserDetails = page.locator(
      `[data-testid^="${ROLES_AND_PERMISSIONS_DATA_TEST_IDS.usersTable}-row-"][data-testid$="-action-read"]`
    );
    this.buttonEditUser = page.locator(
      `[data-testid^="${ROLES_AND_PERMISSIONS_DATA_TEST_IDS.usersTable}-row-"][data-testid$="-action-update"]`
    );
    this.inputSearchUserByEmail = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.inputSearchUsers
    );
    this.inputSelectRoleBatchReassignment = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.reassignUsersDialogBatchRoleSelect
    );
    this.labelReassignmentDrawerTitle = page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.reassignUsersDialogTitle
    );
    this.userRowByEmail = (userEmail: string) =>
      page.locator('tr').filter({
        has: page.getByTestId(ROLES_AND_PERMISSIONS_USER_TEST_IDS.EMAIL_CELL(userEmail)),
      });
    this.userActionsDropdownByEmail = (userEmail: string) =>
      this.userRowByEmail(userEmail).locator(
        `[data-testid^="${ROLES_AND_PERMISSIONS_DATA_TEST_IDS.usersTable}-row-"][data-testid$="-actions-trigger"]`
      );
  }

  // Actions
  // navigation actions
  async clickOnCreateRole() {
    await this.buttonCreateRole.click();
  }
  async clickOnCreateUser() {
    await this.buttonCreateUser.click();
  }
  async goToCreateUserView() {
    await this.buttonCreateUser.click();
    await this.page.waitForURL(`${urlRolesAndPermissionsNewUser}`);
  }
  async goToRolesTab() {
    await this.buttonRolesTab.click();
  }
  async goToUsersTab() {
    await this.buttonUsersTab.click();
  }
  // roles actions
  private async clickOnDropdownForRoleActions(roleName: string) {
    const row = this.page.locator('tr', { hasText: roleName });
    const dropdownButton = row.locator('[data-testid$="-actions-trigger"]');

    await expect(row).toBeVisible();
    await row.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await this.page.waitForTimeout(300);
    await dropdownButton.click();
  }

  // Row action ids are row-scoped (roles-and-permissions-roles-table-row-<id>-action-<op>),
  // so match by suffix rather than a fixed testid; the trigger renders one open [role="menu"].
  private getRoleDropdownOption(operation: 'read' | 'update' | 'delete') {
    return this.page
      .locator('[role="menu"]')
      .last()
      .locator(`[data-testid$="-action-${operation}"]`);
  }

  private getActionAlert(type: string, action: string, severity: string = 'success') {
    const alertTestId = ROLES_AND_PERMISSIONS_DYNAMIC_DATA_TEST_IDS.alertActionWithSeverity(
      type,
      action,
      severity
    );

    return this.page.locator(`[data-testid="${alertTestId}"]:visible`).last();
  }

  private waitForRolesListResponse(timeout = 15000) {
    return this.page.waitForResponse(
      (response) => {
        if (response.request().method() !== 'GET' || response.status() !== 200) {
          return false;
        }

        const url = new URL(response.url());
        return url.pathname === '/merchants/admin/roles';
      },
      { timeout }
    );
  }

  private waitForDeleteRoleResponse(timeout = 15000) {
    return this.page.waitForResponse(
      (response) => {
        const url = new URL(response.url());

        return (
          response.request().method() === 'DELETE' &&
          url.pathname.startsWith('/merchants/admin/roles/')
        );
      },
      { timeout }
    );
  }

  private waitForReassignUsersResponse(timeout = 15000) {
    return this.page.waitForResponse(
      (response) => {
        const url = new URL(response.url());

        return (
          response.request().method() === 'PATCH' &&
          response.status() === 200 &&
          url.pathname === '/merchants/admin/roles/users-reassign'
        );
      },
      { timeout }
    );
  }

  private async clickRoleDropdownOption(option: Locator) {
    await option.waitFor({ state: 'attached', timeout: 5000 });
    await option.scrollIntoViewIfNeeded();

    try {
      await option.click();
    } catch {
      await option.evaluate((node) => {
        (node as HTMLElement).click();
      });
    }
  }

  async goToViewRoleDetails(roleName: string) {
    await this.clickOnDropdownForRoleActions(roleName);
    const buttonViewRoleDetails = this.getRoleDropdownOption('read');

    await this.clickRoleDropdownOption(buttonViewRoleDetails);
  }
  async goToEditRole(roleName: string) {
    await this.clickOnDropdownForRoleActions(roleName);
    const buttonEditRole = this.getRoleDropdownOption('update');

    await this.clickRoleDropdownOption(buttonEditRole);
  }
  async deleteRole(roleName: string) {
    await this.clickOnDropdownForRoleActions(roleName);
    const buttonDeleteRole = this.getRoleDropdownOption('delete');

    await this.clickRoleDropdownOption(buttonDeleteRole);

    // Handle confirmation dialog
    const confirmButton = this.page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.modalRoleConfirmButton
    );
    await expect(confirmButton).toBeVisible();
    const deleteRoleResponse = this.waitForDeleteRoleResponse();
    const rolesListResponse = this.waitForRolesListResponse().catch(() => null);
    await Promise.all([deleteRoleResponse, confirmButton.click()]);
    await rolesListResponse;
  }
  async deleteRoleWithReassignment(roleName: string, newRoleName?: string) {
    // First verify if the role has users assigned by checking the delete button behavior
    await this.clickOnDropdownForRoleActions(roleName);
    const buttonDeleteRole = this.getRoleDropdownOption('delete');

    await this.clickRoleDropdownOption(buttonDeleteRole);

    // Wait for confirmation modal and click confirm
    const modalConfirmButton = this.page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.modalRoleConfirmButton
    );
    await expect(modalConfirmButton).toBeVisible({ timeout: 5000 });

    const deleteAttemptResponse = this.waitForDeleteRoleResponse();
    await Promise.all([deleteAttemptResponse, modalConfirmButton.click()]);

    // Check if reassignment drawer appears
    const isReassignmentDrawerOpen = await this.labelReassignmentDrawerTitle.isVisible();

    if (isReassignmentDrawerOpen && newRoleName) {
      // Reassigning users only moves them off the role (see
      // handleReassignmentFlow) -- it does not delete the role. Deletion has
      // to be re-triggered now that the role has 0 assigned users, at which
      // point it goes straight through without the dialog reappearing.
      await this.handleReassignmentFlow(newRoleName);

      await this.clickOnDropdownForRoleActions(roleName);
      await this.clickRoleDropdownOption(this.getRoleDropdownOption('delete'));
      await expect(modalConfirmButton).toBeVisible({ timeout: 5000 });
      const secondDeleteAttemptResponse = this.waitForDeleteRoleResponse();
      await Promise.all([secondDeleteAttemptResponse, modalConfirmButton.click()]);

      const successAlert = this.getActionAlert('roles', 'delete');
      await expect(successAlert).toBeVisible({ timeout: 10000 });
      await expect(successAlert).toContainText(roleName);
    } else {
      const successAlert = this.getActionAlert('roles', 'delete');
      await expect(successAlert).toBeVisible({ timeout: 10000 });
      await expect(successAlert).toContainText(roleName);
    }
  }

  // NOTE: this only performs the reassignment step. ReassignUsersDialog
  // (verified live against admin-ff source) is a single confirm-step dialog
  // -- select a role, click "Reasignar" -- whose onSuccess only invalidates
  // the users/roles queries (useReassignUsersMutation), it does NOT delete
  // the role. Deletion is a separate action the caller must re-trigger once
  // the role has 0 assigned users. See deleteRoleWithReassignment.
  private async handleReassignmentFlow(newRoleName: string) {
    await expect(this.inputSelectRoleBatchReassignment).toBeVisible({ timeout: 5000 });
    await this.inputSelectRoleBatchReassignment.click();

    const roleOption = this.page
      .locator(`[data-testid^="${ROLES_AND_PERMISSIONS_DATA_TEST_IDS.reassignRoleOptionPrefix}"]`)
      .filter({ hasText: newRoleName });
    await expect(roleOption).toBeVisible({ timeout: 10000 });
    await roleOption.click();

    const continueButton = this.page.getByTestId(
      ROLES_AND_PERMISSIONS_DATA_TEST_IDS.reassignUsersDialogContinueButton
    );
    await expect(continueButton).toBeEnabled({ timeout: 5000 });
    const reassignUsersResponse = this.waitForReassignUsersResponse();
    await Promise.all([reassignUsersResponse, continueButton.click()]);

    // Sonner (the toast lib backing this notification) genuinely double-renders
    // a single toast during its enter/stack transition -- confirmed live: the
    // app only calls onShowNotification/toast.success() once for this event, but
    // two fully-visible, identical `data-testid` matches land in the DOM at once.
    // Not a real double-notification, so scope to the current (last) instance
    // rather than patching the (correctly-behaving-once) app code.
    const successAlert = this.page
      .getByTestId(ROLES_AND_PERMISSIONS_DATA_TEST_IDS.reassignUsersDialogSuccessAlert)
      .last();
    await expect(successAlert).toBeVisible({ timeout: 10000 });
  }

  // users actions
  async goToViewUserDetails(userEmail: string) {
    const row = this.userRowByEmail(userEmail);
    const dropdownButton = this.userActionsDropdownByEmail(userEmail);

    await expect(row).toBeVisible();
    await dropdownButton.click();
    await expect(this.buttonViewUserDetails).toBeVisible();
    await this.buttonViewUserDetails.click();
  }
  async goToEditUser(userEmail: string) {
    const row = this.userRowByEmail(userEmail);
    const dropdownButton = this.userActionsDropdownByEmail(userEmail);

    await expect(row, `The user row for ${userEmail} is not visible`).toBeVisible({
      timeout: 40000,
    });
    await expect(
      dropdownButton,
      `The user actions trigger for ${userEmail} is not visible`
    ).toBeVisible({
      timeout: 40000,
    });
    await dropdownButton.click();
    await expect(this.buttonEditUser, 'The edit user action is not visible').toBeVisible({
      timeout: 40000,
    });
    await this.buttonEditUser.click();
  }
  async openUserActionsDropdown(userEmail: string) {
    const row = this.userRowByEmail(userEmail);
    const dropdownButton = this.userActionsDropdownByEmail(userEmail);

    await expect(row).toBeVisible();
    await dropdownButton.click();
  }
  async searchUserByEmail(userEmail: string) {
    const normalizedEmail = userEmail.toLocaleLowerCase();

    const usersSearchResponse = this.page
      .waitForResponse(
        (response) => {
          if (response.request().method() !== 'GET' || response.status() !== 200) {
            return false;
          }

          const url = new URL(response.url());

          return url.pathname.includes('/merchant-users');
        },
        { timeout: 5000 }
      )
      .catch(() => {
        return null;
      });

    await this.inputSearchUserByEmail.clear();
    await this.inputSearchUserByEmail.fill(normalizedEmail);
    await expect(this.inputSearchUserByEmail).toHaveValue(normalizedEmail);
    await usersSearchResponse;
    await this.page.waitForTimeout(500);
  }
  // Assertions:
  // common assertions
  async assertPresenceInRolesAndPermissionsView() {
    await expect(this.page.url()).toBe(`${urlRolesAndPermissionsRolesTab}`);
    await expect(this.labelTitleRolesAndPermissions).toBeVisible();
  }

  async assertPresenceInRolesTab() {
    expect(this.page.url()).toBe(`${urlRolesAndPermissionsRolesTab}`);
    await expect(this.labelTitleRolesAndPermissions).toBeVisible();
    await expect(this.buttonCreateRole).toBeVisible();
  }

  async assertPresenceInUsersTab() {
    await expect(this.page.url()).toBe(`${urlRolesAndPermissionsUsersTab}`);
    await expect(this.labelTitleRolesAndPermissions).toBeVisible();
    await expect(this.buttonCreateUser).toBeVisible();
  }
  async assertRoleCreationSuccess(roleName: string) {
    await this.page.waitForURL(`${urlRolesAndPermissionsRolesTab}`);
    const alertLocator = this.getActionAlert('roles', 'create');
    await expect(alertLocator).toBeVisible();
    await expect(alertLocator).toContainText(roleName);
  }
  async assertRoleEditionSuccess(roleName: string) {
    await this.page.waitForURL(`${urlRolesAndPermissionsRolesTab}`);
    const alertLocator = this.getActionAlert('roles', 'update');
    await expect(alertLocator).toBeVisible();
    await expect(alertLocator).toContainText(roleName);
  }
  async assertRoleDeletionSuccess(roleName: string) {
    await this.page.waitForURL(`${urlRolesAndPermissionsRolesTab}`);
    const alertLocator = this.getActionAlert('roles', 'delete');
    try {
      await expect(alertLocator).toBeVisible({ timeout: 10000 });
      await expect(alertLocator).toContainText(roleName);
    } catch {
      await this.page.reload();
      await this.page.waitForResponse(
        (response) => response.url().includes('/roles') && response.status() === 200,
        { timeout: 15000 }
      );
      const visibleRoleLocator = this.page.locator(
        `[data-testid="roles-and-permissions-role-name-${roleName}"]:visible`
      );

      await expect(visibleRoleLocator).toHaveCount(0, { timeout: 10000 });
    }
  }
  async assertUserCreationSuccess(userEmail: string) {
    await this.page.waitForURL(`${urlRolesAndPermissionsUsersTab}`);
    const alertLocator = this.getActionAlert('users', 'create');
    await expect(alertLocator).toBeVisible({ timeout: 20000 });
    await expect(alertLocator).toContainText(new RegExp(escapeRegExp(userEmail), 'i'));
  }
  async assertUserEditionSuccess(userEmail: string) {
    await this.page.waitForURL(`${urlRolesAndPermissionsUsersTab}`);
    const alertLocator = this.getActionAlert('users', 'update');
    await expect(alertLocator).toBeVisible({ timeout: 20000 });
    await expect(alertLocator).toContainText(new RegExp(escapeRegExp(userEmail), 'i'));
  }

  async assertRoleInRolesList(roleName: string) {
    await this.assertRoleAndPermissionInTable(roleName);
  }

  async assertRoleAndPermissionInTable(roleName: string) {
    const roleLocator = this.page.getByTestId(`roles-and-permissions-role-name-${roleName}`);
    let roleLocatorFound = false;
    // Retry because a newly created role may not appear immediately in the list
    await retryUntil(
      async () => {
        try {
          await expect(roleLocator).toBeAttached({ timeout: 10_000 });
          await expect(roleLocator).toHaveCount(1);
          roleLocatorFound = true;
        } catch (error) {
          await this.page.reload();
        }
      },
      () => roleLocatorFound,
      3
    );
    expect(roleLocatorFound, `Role locator not found "${roleName}"`).toBe(true);
  }

  async assertUserInUsersList(userEmail: string) {
    const userLocator = this.page.getByTestId(
      ROLES_AND_PERMISSIONS_USER_TEST_IDS.EMAIL_CELL(userEmail)
    );
    await expect(userLocator).toBeVisible({ timeout: 10000 });
    await expect(userLocator).toHaveCount(1);
  }
  async assertRoleNotInRolesList(roleName: string) {
    await this.page.reload();
    await this.waitForRolesListResponse();
    const visibleRoleLocator = this.page.locator(
      `[data-testid="roles-and-permissions-role-name-${roleName}"]:visible`
    );
    await expect(visibleRoleLocator).toHaveCount(0, { timeout: 10000 });
  }
}
