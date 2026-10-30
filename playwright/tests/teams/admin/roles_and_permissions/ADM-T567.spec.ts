import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import {
  RESOURCES,
  ACTIONS,
  ENVIRONMENTS,
  ACCESS_TYPE,
} from '@pages/admin/constants/rolesAndPermissions';
import { AdminRoleManagementPage } from '@pages/admin/roles_and_permissions/adminRoleManagementPage';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import { faker } from '@faker-js/faker';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { Merchant, createNetworkFixture } from '@tests/teams/admin/helpers/rolesAndPermissions';

const configMerchant = new ConfigMerchant();

let userEmail: string;
const password = '123456';
const roleName = `Role test ${faker.string.alphanumeric(5).toLowerCase()}`;
const permissions: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]> = {};
const environments: (keyof typeof ENVIRONMENTS)[] = [];
let selectedNetworkMerchants: Merchant[];
let networkName: string;
let merchantsIds: string[];

test.describe('@regression DEUNA Admin - Edit role - Edit permissions (Single merchant)', () => {
  test.beforeAll(async ({ merchantAuthService }) => {
    // Single-merchant role: the network below only exists to give this
    // suite's assertRoleDetails() call a real network name, mirroring the
    // (also-unused-by-access-type) network fixture the old static constants
    // provided here.
    const fixture = await createNetworkFixture(configMerchant, 1);
    selectedNetworkMerchants = fixture.merchants;
    networkName = fixture.networkName;
    merchantsIds = selectedNetworkMerchants.map((merchant) => merchant.id);

    const { token } = await merchantAuthService.merchantLogin();

    // Create a user for testing permissions after role edit
    userEmail = await apiCallNewman.createMerchantUserV3WithoutNetwork(
      'merchant_admin',
      'all',
      merchantsIds[0],
      token
    );
  });

  test(
    '@ADM-T567 Edit role - Edit permissions (Single merchant)',
    { tag: ['@admin', '@admin-preprod', '@team_admin', '@admin_smoke'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminRolesAndPermissions = new AdminRolesAndPermissionsPage(page);
      const adminRoleManagement = new AdminRoleManagementPage(page);

      await test.step('The user logs in the admin and goes to Roles and Permissions', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantsIds[0]);
        await adminHomePage.goToRolesAndPermissions();
        await adminRolesAndPermissions.assertPresenceInRolesAndPermissionsView();
        await adminRolesAndPermissions.assertPresenceInRolesTab();
      });

      await test.step('Create a new role with all permissions', async () => {
        await adminRolesAndPermissions.clickOnCreateRole();
        await adminRoleManagement.assertPresenceInCreateRoleForm();
      });

      await test.step('Fill Role Name', async () => {
        await adminRoleManagement.assertRoleNameStepIsActive();
        await adminRoleManagement.fillRoleName(roleName);
        await adminRoleManagement.assertRoleNameIsFilled(roleName);
      });

      await test.step('Choose Merchant as Access Type', async () => {
        await adminRoleManagement.selectAccessTypeOption(ACCESS_TYPE.merchant, merchantsIds[0]);
        await adminRoleManagement.assertSelectedAccessType(ACCESS_TYPE.merchant);
      });

      await test.step('Choose a merchant', async () => {
        await adminRoleManagement.selectMerchantByName(
          selectedNetworkMerchants[0].name,
          selectedNetworkMerchants[0].id
        );
        await adminRoleManagement.assertSelectedMerchant(selectedNetworkMerchants[0].name);
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

      await test.step('Check all permissions for the merchant', async () => {
        const selectedPermissions = await adminRoleManagement.checkRandomPermissions(
          merchantsIds[0],
          8 // Many permissions initially
        );
        await adminRoleManagement.assertPermissionsChecked(merchantsIds[0], selectedPermissions);
        await adminRoleManagement.assertActivateButtonIsEnabled();
      });

      await test.step('Save the new role', async () => {
        await adminRoleManagement.saveRole();
        await adminRolesAndPermissions.assertRoleCreationSuccess(roleName);
        await adminRolesAndPermissions.assertRoleInRolesList(roleName);
      });

      await test.step('Edit the role - change permissions', async () => {
        await adminRolesAndPermissions.goToEditRole(roleName);
        // Extract roleId from current URL
        const currentUrl = page.url();
        const roleId = currentUrl.split('/').pop() || '';
        await adminRoleManagement.assertPresenceInEditRoleForm(roleName, roleId);
      });

      await test.step('Verify permissions step is active', async () => {
        await adminRoleManagement.assertPermissionsStepIsActive();
      });

      let newPermissions: Record<string, string[]> = {};
      await test.step('User changes permissions - select different ones', async () => {
        // First, uncheck all current permissions to clear the state
        await adminRoleManagement.uncheckAllPermissions(merchantsIds[0]);

        // Then check different random permissions (fewer than before)
        const selectedPermissions = await adminRoleManagement.checkRandomPermissions(
          merchantsIds[0],
          3 // Less permissions than original
        );
        newPermissions[merchantsIds[0]] = selectedPermissions;
        permissions[merchantsIds[0]] = selectedPermissions as any;
        await adminRoleManagement.assertPermissionsChecked(merchantsIds[0], selectedPermissions);
      });

      await test.step('Save changes', async () => {
        await adminRoleManagement.saveChanges();
        await adminRolesAndPermissions.assertRoleEditionSuccess(roleName);
        await adminRolesAndPermissions.assertRoleInRolesList(roleName);
      });

      await test.step('Verify role details with new permissions', async () => {
        await adminRolesAndPermissions.goToViewRoleDetails(roleName);
        await adminRoleManagement.assertRoleDetails({
          roleName,
          merchants: [selectedNetworkMerchants[0].name],
          environments,
          permissions,
          networkName,
        });
        await adminRoleManagement.assertRoleDetailsAreReadOnly([merchantsIds[0]]);
      });

      await test.step('Verify user has new permissions after role edit', async () => {
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();

        // Login as the user with the edited role
        await adminLoginPage.loginWithEmailAndPassword(userEmail, password);

        // Verify the user now has the new permissions
        const allNewPermissions = Object.values(newPermissions).flat();
        await adminHomePage.assertVisibleModulesAccordingToPermissions(allNewPermissions);
      });
    }
  );
});
