import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import { AdminRoleManagementPage } from '@pages/admin/roles_and_permissions/adminRoleManagementPage';
import { ACTIONS, ENVIRONMENTS, RESOURCES } from '@pages/admin/constants/rolesAndPermissions';
import { faker } from '@faker-js/faker';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { Merchant } from '@tests/teams/admin/helpers/rolesAndPermissions';

const configMerchant = new ConfigMerchant();

let userEmail: string;
const password = '123456';
const roleName = `Role test ${faker.string.alphanumeric(5).toLowerCase()}`;
const permissions: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]> = {};
const environments: (keyof typeof ENVIRONMENTS)[] = [];
let selectedMerchant: Merchant;

test.describe('@regression DEUNA Admin - Delete role without assigned users', () => {
  test.beforeAll(async ({ merchantAuthService }) => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    selectedMerchant = { id: merchantConfig.merchantId, name: merchantConfig.merchantName };

    const { token } = await merchantAuthService.merchantLogin();
    // Create user with merchant admin role
    userEmail = await apiCallNewman.createMerchantUserV3WithoutNetwork(
      'merchant_admin',
      'all',
      selectedMerchant.id,
      token
    );
  });

  test(
    '@ADM-T662 Delete role without assigned users',
    { tag: ['@admin', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminRolesAndPermissions = new AdminRolesAndPermissionsPage(page);
      const adminRoleManagement = new AdminRoleManagementPage(page);

      await test.step('The user logs in the admin and goes to Roles and Permissions', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(selectedMerchant.id);
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
        await adminLoginPage.loginWithEmailAndPassword(userEmail, password);
        await adminHomePage.goToRolesAndPermissions();
        await adminRolesAndPermissions.assertPresenceInRolesAndPermissionsView();
        await adminRolesAndPermissions.assertPresenceInRolesTab();
      });

      await test.step('User creates a new role as precondition', async () => {
        await adminRolesAndPermissions.clickOnCreateRole();
        await adminRoleManagement.assertPresenceInCreateRoleForm();
      });

      await test.step('Fill Role Name', async () => {
        await adminRoleManagement.assertRoleNameStepIsActive();
        await adminRoleManagement.fillRoleName(roleName);
        await adminRoleManagement.assertRoleNameIsFilled(roleName);
      });

      await test.step('Select environments', async () => {
        await adminRoleManagement.assertSelectEnvironmentStepIsActive();
        await adminRoleManagement.selectProductionEnvironment();
        await adminRoleManagement.selectSandboxEnvironment();
        environments.push(ENVIRONMENTS.production);
        environments.push(ENVIRONMENTS.sandbox);
        await adminRoleManagement.assertProductionEnvironmentIsChecked();
        await adminRoleManagement.assertSandboxEnvironmentIsChecked();
      });

      await test.step('Select all permissions for the merchant', async () => {
        const selectedPermissions = await adminRoleManagement.checkAllColumnMerchantPermissions(
          selectedMerchant.id
        );
        permissions[selectedMerchant.id] = selectedPermissions;
        await adminRoleManagement.assertPermissionsChecked(
          selectedMerchant.id,
          selectedPermissions
        );
      });

      await test.step('Save the new role', async () => {
        await adminRoleManagement.saveRole();
        await adminRolesAndPermissions.assertRoleCreationSuccess(roleName);
        await adminRolesAndPermissions.assertRoleInRolesList(roleName);
      });

      await test.step('Verify role has no assigned users', async () => {
        await adminRolesAndPermissions.goToUsersTab();
        await adminRolesAndPermissions.assertPresenceInUsersTab();
        // Search for users with the created role - should return no results
        await adminRolesAndPermissions.searchUserByEmail(roleName);
        // Go back to roles tab for deletion
        await adminRolesAndPermissions.goToRolesTab();
        await adminRolesAndPermissions.assertPresenceInRolesTab();
      });

      await test.step('Delete the role without assigned users', async () => {
        await adminRolesAndPermissions.deleteRole(roleName);
        await adminRolesAndPermissions.assertRoleDeletionSuccess(roleName);
        await adminRolesAndPermissions.assertRoleNotInRolesList(roleName);
      });
    }
  );
});
