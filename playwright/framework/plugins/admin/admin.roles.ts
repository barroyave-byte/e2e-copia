import { Context, FrameworkPlugin } from '../interface';
import { AdminRoleManagementPage } from '@pages/admin/roles_and_permissions/adminRoleManagementPage';
import { AdminUserManagementPage } from '@pages/admin/roles_and_permissions/adminUserManagementPage';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import {
  RESOURCES,
  ACTIONS,
  ENVIRONMENTS,
  ACCESS_TYPE,
} from '@pages/admin/constants/rolesAndPermissions';

export class PluginAdminRoles extends FrameworkPlugin {
  pluginBaseName = 'admin.roles';

  rolePage!: AdminRoleManagementPage;
  userPage!: AdminUserManagementPage;
  rolesPage!: AdminRolesAndPermissionsPage;
  homePage!: AdminHomePage;
  loginPage!: AdminLoginPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.rolePage = new AdminRoleManagementPage(context.page);
    this.userPage = new AdminUserManagementPage(context.page);
    this.rolesPage = new AdminRolesAndPermissionsPage(context.page);
    this.homePage = new AdminHomePage(context.page);
    this.loginPage = new AdminLoginPage(context.page);
  }

  // ── Role actions ──────────────────────────────────────────────────────────

  /** @description Creates and updates a temporary role to emit a role-permissions audit event. */
  async $tf_createAndUpdateRolePermissions(params: {
    merchantId: string;
    merchantName: string;
    roleName: string;
  }) {
    await this.loginPage.gotoAdmin();
    await this.homePage.setMerchantIdSessionStorage(params.merchantId);
    await this.homePage.goToRolesAndPermissions();
    await this.rolesPage.clickOnCreateRole();
    await this.rolePage.fillRoleName(params.roleName);
    await this.rolePage.selectAccessTypeOption(ACCESS_TYPE.merchant, params.merchantId);
    await this.rolePage.selectMerchantByName(params.merchantName, params.merchantId);
    await this.rolePage.selectProductionEnvironment();
    await this.rolePage.checkRandomPermissions(params.merchantId, 1);
    await this.rolePage.saveRole();
    await this.rolesPage.assertRoleCreationSuccess(params.roleName);
    await this.rolesPage.goToEditRole(params.roleName);
    await this.rolePage.checkRandomPermissions(params.merchantId, 1);
    await this.rolePage.saveChanges();
    await this.rolesPage.assertRoleEditionSuccess(params.roleName);
  }

  /** @description Fills the role name input field with the provided name. */
  async $tf_fillRoleName(params: { roleName: string }) {
    await this.rolePage.fillRoleName(params.roleName);
  }

  /** @description Selects the access type (network or merchant) in the create/edit role form. */
  async $tf_selectAccessType(params: { type: keyof typeof ACCESS_TYPE }) {
    await this.rolePage.selectAccessTypeOption(ACCESS_TYPE[params.type]);
  }

  /** @description Searches for and selects a network by name in the role access type step. */
  async $tf_selectNetwork(params: { networkName: string; networkId: string }) {
    await this.rolePage.selectNetworkByName(params.networkName, params.networkId);
  }

  /** @description Searches for and selects a merchant by name in the role access type step. */
  async $tf_selectMerchant(params: { merchantName: string; merchantId: string }) {
    await this.rolePage.selectMerchantByName(params.merchantName, params.merchantId);
  }

  /** @description Selects multiple network merchants by name in the role access type step. */
  async $tf_selectNetworkMerchants(params: { merchantNames: string[] }) {
    await this.rolePage.selectNetworkMerchantsByName(params.merchantNames);
  }

  /** @description Checks the production environment checkbox in the role environment step. */
  async $tf_selectProductionEnvironment() {
    await this.rolePage.selectProductionEnvironment();
  }

  /** @description Checks the sandbox environment checkbox in the role environment step. */
  async $tf_selectSandboxEnvironment() {
    await this.rolePage.selectSandboxEnvironment();
  }

  /** @description Checks a resource permission checkbox for the given merchant in the permissions step. */
  async $tf_checkResource(params: { resource: keyof typeof RESOURCES; merchantId: string }) {
    await this.rolePage.checkResource(params.resource, params.merchantId);
  }

  /** @description Unchecks a resource permission checkbox for the given merchant in the permissions step. */
  async $tf_uncheckResource(params: { resource: keyof typeof RESOURCES; merchantId: string }) {
    await this.rolePage.uncheckResource(params.resource, params.merchantId);
  }

  /** @description Checks an action permission checkbox for the given merchant in the permissions step. */
  async $tf_checkAction(params: { action: keyof typeof ACTIONS; merchantId: string }) {
    await this.rolePage.checkAction(params.action, params.merchantId);
  }

  /** @description Unchecks an action permission checkbox for the given merchant in the permissions step. */
  async $tf_uncheckAction(params: { action: keyof typeof ACTIONS; merchantId: string }) {
    await this.rolePage.uncheckAction(params.action, params.merchantId);
  }

  /** @description Checks all permission checkboxes visible in a merchant column and returns the list of checked permission keys. */
  async $tf_checkAllColumnMerchantPermissions(params: { merchantId: string }) {
    return this.rolePage.checkAllColumnMerchantPermissions(params.merchantId);
  }

  /** @description Randomly checks a given number of permissions for the merchant and returns the checked permission keys. */
  async $tf_checkRandomPermissions(params: { merchantId: string; total?: number }) {
    return this.rolePage.checkRandomPermissions(params.merchantId, params.total);
  }

  /** @description Unchecks all currently-checked permission checkboxes for the given merchant. */
  async $tf_uncheckAllPermissions(params: { merchantId: string }) {
    await this.rolePage.uncheckAllPermissions(params.merchantId);
  }

  /** @description Clicks the save/activate role button to complete role creation. */
  async $tf_saveRole() {
    await this.rolePage.saveRole();
  }

  /** @description Clicks the save changes button to persist edits to an existing role. */
  async $tf_saveChanges() {
    await this.rolePage.saveChanges();
  }

  /** @description Clicks the cancel button to abort role creation or editing. */
  async $tf_cancelRoleCreation() {
    await this.rolePage.cancelRoleCreation();
  }

  /** @description Navigates to the edit role form for the given role ID. */
  async $tf_goToEditRole(params: { roleId: string }) {
    await this.context.page.goto(
      `${require('@support/envConfig').default.ADMIN_URL}/roles-and-permissions/roles/${params.roleId}`
    );
  }

  /** @description Navigates to the read-only role details view for the given role ID. */
  async $tf_goToViewRoleDetails(params: { roleId: string }) {
    await this.context.page.goto(
      `${require('@support/envConfig').default.ADMIN_URL}/roles-and-permissions/roles/${params.roleId}/view`
    );
  }

  /** @description Finds and deletes the role with the given name using the roles table context menu. */
  async $tf_deleteRole(params: { roleName: string }) {
    await this.homePage.goToRolesAndPermissions();
    await this.rolesPage.deleteRole(params.roleName);
    await this.rolesPage.assertRoleDeletionSuccess(params.roleName);
  }

  /** @description Deletes the role with the given name and reassigns its users to the specified replacement role. */
  async $tf_deleteRoleWithReassignment(params: { roleName: string; reassignRoleName: string }) {
    // Stub: implement via admin UI when delete role with reassignment flow is available
    const deleteButton = this.context.page.getByTestId(`role-delete-${params.roleName}`);
    await deleteButton.click();
  }

  /** @description Asserts that the role details summary (name, environments, merchants, permissions) are correctly displayed on the review step. */
  async $tf_assertRoleDetails(params: {
    roleName: string;
    permissions: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]>;
    environments: (keyof typeof ENVIRONMENTS)[];
    merchants: string[];
    networkName?: string;
  }) {
    await this.rolePage.assertRoleDetails(params);
  }

  /** @description Asserts that the role details view is in read-only mode with all form inputs hidden and permission checkboxes disabled. */
  async $tf_assertRoleDetailsAreReadOnly(params: { merchantIds: string[] }) {
    await this.rolePage.assertRoleDetailsAreReadOnly(params.merchantIds);
  }

  /** @description Asserts that the browser is on the create new role page and the form title and description are visible. */
  async $tf_assertPresenceInCreateRoleForm() {
    await this.rolePage.assertPresenceInCreateRoleForm();
  }

  /** @description Asserts that the browser is on the edit role page for the given role and the edit form is properly displayed. */
  async $tf_assertPresenceInEditRoleForm(params: { roleName: string; roleId: string }) {
    await this.rolePage.assertPresenceInEditRoleForm(params.roleName, params.roleId);
  }

  /** @description Asserts that the missing permissions error message is visible in the permissions step. */
  async $tf_assertMissingPermissionsErrorMessage() {
    await this.rolePage.assertMissingPermissionsErrorMessageIsVisible();
  }

  // ── User actions ──────────────────────────────────────────────────────────

  /** @description Fills the first name input field in the user creation form. */
  async $tf_fillUserName(params: { userName: string }) {
    await this.userPage.fillUserName(params.userName);
  }

  /** @description Fills the last name input field in the user creation form. */
  async $tf_fillUserLastName(params: { userLastName: string }) {
    await this.userPage.fillUserLastName(params.userLastName);
  }

  /** @description Fills the email input field in the user creation form. */
  async $tf_fillUserEmail(params: { userEmail: string }) {
    await this.userPage.fillUserEmail(params.userEmail);
  }

  /** @description Selects the superadmin role option in the role or permissions selection step. */
  async $tf_selectRoleSuperadmin() {
    await this.userPage.chooseRoleOrPermissions('role');
    await this.userPage.selectRoleByName('Superadmin');
  }

  /** @description Selects the merchant owner role option in the role or permissions selection step. */
  async $tf_selectRoleMerchantOwner() {
    await this.userPage.chooseRoleOrPermissions('role');
    await this.userPage.selectRoleByName('Merchant Owner');
  }

  /** @description Selects the merchant admin role option in the role or permissions selection step. */
  async $tf_selectRoleMerchantAdmin() {
    await this.userPage.chooseRoleOrPermissions('role');
    await this.userPage.selectRoleByName('Merchant Admin');
  }

  /** @description Selects the merchant user role option in the role or permissions selection step. */
  async $tf_selectRoleMerchantUser() {
    await this.userPage.chooseRoleOrPermissions('role');
    await this.userPage.selectRoleByName('Merchant User');
  }

  /** @description Selects the network access type in the user access type step. */
  async $tf_selectAccessTypeNetwork() {
    await this.userPage.selectAccessTypeOption(ACCESS_TYPE.network);
  }

  /** @description Selects the merchant access type in the user access type step. */
  async $tf_selectAccessTypeMerchant() {
    await this.userPage.selectAccessTypeOption(ACCESS_TYPE.merchant);
  }

  /** @description Selects the custom permissions option (instead of role) in the role or permissions step. */
  async $tf_selectSpecificPermissions() {
    await this.userPage.chooseRoleOrPermissions('permissions');
  }

  /** @description Creates a new merchant admin user with the given details, selecting merchant access type. */
  async $tf_createMerchantAdmin(params: {
    userName: string;
    userLastName: string;
    userEmail: string;
    merchantName: string;
    merchantId: string;
  }) {
    await this.userPage.fillUserName(params.userName);
    await this.userPage.fillUserLastName(params.userLastName);
    await this.userPage.fillUserEmail(params.userEmail);
    await this.userPage.chooseRoleOrPermissions('role');
    await this.userPage.selectRoleByName('Merchant Admin');
    await this.userPage.selectAccessTypeOption(ACCESS_TYPE.merchant);
    await this.userPage.selectMerchantByName(params.merchantName, params.merchantId);
  }

  /** @description Creates a new merchant user with the given details, selecting merchant access type. */
  async $tf_createMerchantUser(params: {
    userName: string;
    userLastName: string;
    userEmail: string;
    merchantName: string;
    merchantId: string;
  }) {
    await this.userPage.fillUserName(params.userName);
    await this.userPage.fillUserLastName(params.userLastName);
    await this.userPage.fillUserEmail(params.userEmail);
    await this.userPage.chooseRoleOrPermissions('role');
    await this.userPage.selectRoleByName('Merchant User');
    await this.userPage.selectAccessTypeOption(ACCESS_TYPE.merchant);
    await this.userPage.selectMerchantByName(params.merchantName, params.merchantId);
  }

  /** @description Creates a network user with custom permissions for one merchant and returns the generated password. */
  async $tf_createNetworkUserWithPermissions(params: {
    name: string;
    email: string;
    networkName: string;
    networkId: string;
    merchantName: string;
    merchantId: string;
    environments: (keyof typeof ENVIRONMENTS)[];
    permissions: (keyof typeof RESOURCES | keyof typeof ACTIONS)[];
  }) {
    return this.userPage.createUser({
      name: params.name,
      email: params.email,
      roleOrPermissions: 'permissions',
      networkName: params.networkName,
      networkId: params.networkId,
      merchantNames: [params.merchantName],
      environments: params.environments,
      permissions: { [params.merchantId]: params.permissions },
    });
  }

  /** @description Toggles a specific resource or action permission checkbox for a merchant, checking or unchecking as specified. */
  async $tf_togglePermission(params: {
    type: 'resource' | 'action';
    key: string;
    merchantId: string;
    check: boolean;
  }) {
    const { type, key, merchantId, check } = params;
    if (type === 'resource') {
      if (check) {
        await this.userPage.checkResource(key as keyof typeof RESOURCES, merchantId);
      } else {
        await this.userPage.uncheckResource(key as keyof typeof RESOURCES, merchantId);
      }
    } else {
      if (check) {
        await this.userPage.checkAction(key as keyof typeof ACTIONS, merchantId);
      } else {
        await this.userPage.uncheckAction(key as keyof typeof ACTIONS, merchantId);
      }
    }
  }

  // async $tf_disableAllPermissionCheckboxes(params: { merchantId: string }) {
  //   '@description: Unchecks all permission checkboxes for the given merchant in the permissions step.';
  //   await this.userPage.uncheckAllPermissions
  //     ? (this.userPage as any).uncheckAllPermissions(params.merchantId)
  //     : undefined;
  // }

  /** @description Confirms the user creation by clicking the save/confirm button in the confirmation modal. */
  async $tf_confirmCreation() {
    await this.userPage.confirmSaveUserModal();
  }

  /** @description Saves edits to an existing user by clicking the save user button. */
  async $tf_saveEditionChanges() {
    await this.userPage.confirmEditUserRequest();
  }

  /** @description Cancels the current user creation or edit operation. */
  async $tf_cancelEditOrCreation() {
    await this.userPage.cancelUserCreation();
  }

  /** @description Navigates to the create new user page. */
  async $tf_goToCreateUserView() {
    await this.context.page.goto(
      `${require('@support/envConfig').default.ADMIN_URL}/roles-and-permissions/users/new-user`
    );
  }

  /** @description Navigates to the Roles tab on the roles and permissions page. */
  async $tf_goToRolesTab() {
    await this.context.page.goto(
      `${require('@support/envConfig').default.ADMIN_URL}/roles-and-permissions/roles`
    );
  }

  /** @description Navigates to the Users tab on the roles and permissions page. */
  async $tf_goToUsersTab() {
    await this.context.page.goto(
      `${require('@support/envConfig').default.ADMIN_URL}/roles-and-permissions/users`
    );
  }

  /** @description Clicks the create new role button to begin the role creation wizard. */
  async $tf_clickCreateRole() {
    await this.context.page.getByRole('link', { name: /create.*role|nuevo.*rol/i }).click();
  }

  /** @description Clicks the create new user button to begin the user creation wizard. */
  async $tf_clickCreateUser() {
    await this.context.page.getByRole('link', { name: /create.*user|nuevo.*usuario/i }).click();
  }

  /** @description Asserts that the user creation confirmation modal is visible. */
  async $tf_assertUserCreationModalIsVisible() {
    await this.userPage.assertSaveUserConfirmationModalIsVisible();
  }

  /** @description Asserts that all specified permission checkboxes are checked for the given merchant. */
  async $tf_assertPermissionsChecked(params: {
    merchantId: string;
    keys: (keyof typeof RESOURCES | keyof typeof ACTIONS)[];
  }) {
    await this.userPage.assertPermissionsChecked(params.merchantId, params.keys);
  }

  /** @description Asserts that the main form inputs are hidden (disabled) when viewing user details in read-only mode. */
  async $tf_assertFormInputsAreDisabled() {
    await this.userPage.assertUserDetailsAreReadOnly([]);
  }

  /** @description Asserts that the page is in create new user mode by checking the URL and form title. */
  async $tf_assertIsCreateNewUserMode() {
    await this.userPage.assertPresenceInCreateUserForm();
  }

  /** @description Asserts basic user info details are visible, confirming the page is in view or edit user mode. */
  async $tf_assertIsViewOrEditUserMode(params: { userName: string; userEmail: string }) {
    await this.userPage.assertUserNameDetailIsVisible(params.userName);
    await this.userPage.assertUserEmailDetailIsVisible(params.userEmail);
  }

  /** @description Asserts all user detail fields in the review step, including name, email, role/permissions, environments, merchants, and permissions. */
  async $tf_assertUserDetails(params: {
    userName: string;
    userEmail: string;
    roleOrPermissions: 'role' | 'permissions';
    roleName?: string;
    merchants?: string[];
    environments?: (keyof typeof ENVIRONMENTS)[];
    permissions?: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]>;
    networkName?: string;
    rolePermissions?: string;
    roleEnvironments?: string;
  }) {
    await this.userPage.assertUserDetails(params as any);
  }

  /** @description Asserts that the user details view is in read-only mode with all form inputs hidden and permission checkboxes disabled. */
  async $tf_assertUserDetailsAreReadOnly(params: { merchantIds: string[] }) {
    await this.userPage.assertUserDetailsAreReadOnly(params.merchantIds);
  }
}
