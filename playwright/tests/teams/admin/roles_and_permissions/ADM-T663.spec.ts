import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import { AdminUserManagementPage } from '@pages/admin/roles_and_permissions/adminUserManagementPage';
import {
  ENVIRONMENTS,
  ROLE_OR_CUSTOM_PERMISSIONS,
} from '@pages/admin/constants/rolesAndPermissions';
import { faker } from '@faker-js/faker';
import { MerchantUserV3RoleResponse } from '@support/interfaces/adminRolesAndPermissions';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { Merchant, createNetworkFixture } from '@tests/teams/admin/helpers/rolesAndPermissions';

const configMerchant = new ConfigMerchant();

let userEmail: string;
let roleDetails: MerchantUserV3RoleResponse;
const roleName = `Role test ${faker.string.alphanumeric(5).toLowerCase()}`;
const roleNameReassignment = `Role reassignment ${faker.string.alphanumeric(5).toLowerCase()}`;
const password = '123456';
const newUserName = 'Usuario test';
const newUserEmail = EmailGenerator.generatePayerEmail();
let selectedNetworkMerchants: Merchant[];
let selectedNetworkId: string;
let merchantsIds: string[];

test.describe('@regression DEUNA Admin - Delete role with assigned users', () => {
  test.beforeAll(async ({ merchantAuthService }) => {
    const fixture = await createNetworkFixture(configMerchant);
    selectedNetworkMerchants = fixture.merchants;
    selectedNetworkId = fixture.networkId;
    merchantsIds = selectedNetworkMerchants.map((merchant) => merchant.id);

    const { token } = await merchantAuthService.merchantLogin();

    // Create user with merchant admin role
    userEmail = await apiCallNewman.createMerchantUserV3WithoutNetwork(
      'merchant_admin',
      'all',
      merchantsIds[0],
      token
    );

    // Create a role with network access
    roleDetails = await apiCallNewman.createMerchantUserV3Role(
      roleName,
      merchantsIds.slice(0, 1),
      selectedNetworkId,
      [ENVIRONMENTS.sandbox, ENVIRONMENTS.production],
      token
    );

    // Create another role with network access for reassignment
    await apiCallNewman.createMerchantUserV3Role(
      roleNameReassignment,
      merchantsIds,
      selectedNetworkId,
      [ENVIRONMENTS.sandbox, ENVIRONMENTS.production],
      token
    );
  });

  test(
    '@ADM-T663 Delete role with assigned users',
    { tag: ['@admin', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminRolesAndPermissions = new AdminRolesAndPermissionsPage(page);
      const adminUserManagement = new AdminUserManagementPage(page);

      await test.step('The user logs in the admin, goes to Roles and Permissions view and goes to Users tab', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantsIds[0]);
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
        await adminLoginPage.loginWithEmailAndPassword(userEmail, password);
        await adminHomePage.goToRolesAndPermissions();
        await adminRolesAndPermissions.assertPresenceInRolesAndPermissionsView();
        await adminRolesAndPermissions.goToUsersTab();
        await adminRolesAndPermissions.assertPresenceInUsersTab();
      });

      await test.step('User clicks on Create User button', async () => {
        await adminRolesAndPermissions.clickOnCreateUser();
        await adminUserManagement.assertPresenceInCreateUserForm();
      });

      await test.step('Fill User info name', async () => {
        await adminUserManagement.assertUserInfoStepIsActive();
        await adminUserManagement.fillUserName(newUserName);
        await adminUserManagement.assertUserNameIsFilled(newUserName);
      });

      await test.step('Fill User info email', async () => {
        await adminUserManagement.fillUserEmail(newUserEmail);
        await adminUserManagement.assertUserEmailIsFilled(newUserEmail);
      });

      await test.step('Go to choose Role or Custom permissions', async () => {
        await adminUserManagement.assertCustomRoleOrPermissionsStepIsActive();
      });

      await test.step('Choose role option', async () => {
        await adminUserManagement.chooseRoleOrPermissions(ROLE_OR_CUSTOM_PERMISSIONS.role);
        await adminUserManagement.assertRoleRadioIsChecked();
      });

      await test.step('Choose a role', async () => {
        await adminUserManagement.selectRoleByName(roleName);
        await adminUserManagement.assertSelectedRole(roleName);
      });

      await test.step('Verify permissions and environments of the selected role', async () => {
        await adminUserManagement.assertRoleDetails({
          rolePermissions: roleDetails?.roleResources,
          roleEnvironments: roleDetails?.roleEnvironments,
        });
      });

      await test.step('Save the new user', async () => {
        await adminUserManagement.clickStepConfirmButton();
        await adminUserManagement.assertSaveUserConfirmationModalIsVisible();
      });

      await test.step('Confirm the user creation modal', async () => {
        await adminUserManagement.confirmSaveUserModal();
        await adminRolesAndPermissions.assertUserCreationSuccess(newUserEmail);
        await adminRolesAndPermissions.searchUserByEmail(newUserEmail);
        await page.waitForTimeout(5000);
        await adminRolesAndPermissions.assertUserInUsersList(newUserEmail);
      });

      await test.step('Verify user is assigned to role before deletion', async () => {
        await adminRolesAndPermissions.goToUsersTab();
        await adminRolesAndPermissions.searchUserByEmail(newUserEmail);
        await adminRolesAndPermissions.assertUserInUsersList(newUserEmail);
        // Add a wait to ensure user assignment is fully processed
        await page.waitForTimeout(3000);
      });

      await test.step('Delete role with user reassignment', async () => {
        await adminRolesAndPermissions.goToRolesTab();
        await adminRolesAndPermissions.deleteRoleWithReassignment(roleName, roleNameReassignment);
        await adminRolesAndPermissions.assertRoleNotInRolesList(roleName);
      });
    }
  );
});
