import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { ENVIRONMENTS, EDIT_BUTTON_IDS } from '@pages/admin/constants/rolesAndPermissions';
import { AdminRoleManagementPage } from '@pages/admin/roles_and_permissions/adminRoleManagementPage';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import { faker } from '@faker-js/faker';
import { MerchantUserV3RoleResponse } from '@support/interfaces/adminRolesAndPermissions';
import { mapRoleResourcesToPermissions } from '@pages/admin/roles_and_permissions/helpers/permissions';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { Merchant, createNetworkFixture } from '@tests/teams/admin/helpers/rolesAndPermissions';

const configMerchant = new ConfigMerchant();

let roleDetails: MerchantUserV3RoleResponse;
const roleName = `Role test ${faker.string.alphanumeric(5).toLowerCase()}`;
let selectedNetworkMerchants: Merchant[];
let selectedNetworkId: string;
let selectedNetwork: { id: string; name: string };
let merchantsIds: string[];

test.describe('@regression DEUNA Admin - Edit a role by adding Sandbox environment', () => {
  test.beforeAll(async ({ merchantAuthService }) => {
    const fixture = await createNetworkFixture(configMerchant);
    selectedNetworkMerchants = fixture.merchants;
    selectedNetworkId = fixture.networkId;
    selectedNetwork = { id: fixture.networkId, name: fixture.networkName };
    merchantsIds = selectedNetworkMerchants.map((merchant) => merchant.id);

    const { token } = await merchantAuthService.merchantLogin();

    // Create a role with network access
    roleDetails = await apiCallNewman.createMerchantUserV3Role(
      roleName,
      merchantsIds,
      selectedNetworkId,
      [ENVIRONMENTS.production],
      token
    );
  });

  test(
    '@ADM-T566 Edit a role by adding Sandbox environment',
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

      await test.step('User clicks on Edit a Role', async () => {
        await adminRolesAndPermissions.goToEditRole(roleName);
        await adminRoleManagement.assertPresenceInEditRoleForm(roleName, roleDetails.roleID);
      });

      await test.step('User chooses Sandbox environment', async () => {
        await adminRoleManagement.selectSandboxEnvironment();
        await adminRoleManagement.assertSandboxEnvironmentIsChecked();
      });

      await test.step('Save changes', async () => {
        await adminRoleManagement.saveChanges();
        await adminRolesAndPermissions.assertRoleEditionSuccess(roleName);
        await adminRolesAndPermissions.assertRoleInRolesList(roleName);
      });

      await test.step('Verify role details', async () => {
        await adminRolesAndPermissions.goToViewRoleDetails(roleName);
        const merchantNames = selectedNetworkMerchants.map((merchant) => merchant.name);
        const permissions = mapRoleResourcesToPermissions(roleDetails?.roleResources);
        await adminRoleManagement.assertRoleDetails({
          roleName,
          merchants: merchantNames,
          environments: [ENVIRONMENTS.sandbox, ENVIRONMENTS.production],
          permissions,
          networkName: selectedNetwork.name,
        });
        await adminRoleManagement.assertRoleDetailsAreReadOnly(merchantsIds);
      });
    }
  );
});
