import { test, expect } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import {
  ACCESS_TYPE,
  EDIT_BUTTON_IDS,
  RESOURCES,
  ACTIONS,
} from '@pages/admin/constants/rolesAndPermissions';
import { AdminRoleManagementPage } from '@pages/admin/roles_and_permissions/adminRoleManagementPage';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import { faker } from '@faker-js/faker';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { Merchant, createNetworkFixture } from '@tests/teams/admin/helpers/rolesAndPermissions';

const configMerchant = new ConfigMerchant();

const roleName = `Role test ${faker.string.alphanumeric(5).toLowerCase()}`;
const permissions: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]> = {};

let allNetworkMerchants: Merchant[];
let selectedNetworkMerchants: Merchant[];
let merchantsIds: string[];
let selectedNetwork: { id: string; name: string };
let networkName: string;
let remainingMerchants: string[];

test.describe('@regression DEUNA Admin - Edit role - Remove merchant (Merchant Admin with Network)', () => {
  test.beforeAll(async ({ merchantAuthService }) => {
    const fixture = await createNetworkFixture(configMerchant);
    allNetworkMerchants = fixture.merchants;
    selectedNetworkMerchants = allNetworkMerchants.slice(0, 3);
    merchantsIds = selectedNetworkMerchants.map((merchant) => merchant.id);
    selectedNetwork = { id: fixture.networkId, name: fixture.networkName };
    networkName = selectedNetwork.name;
    remainingMerchants = [selectedNetworkMerchants[0].name, selectedNetworkMerchants[1].name];

    const { token } = await merchantAuthService.merchantLogin();

    await apiCallNewman.createMerchantUserV3WithoutNetwork(
      'merchant_admin',
      'all',
      merchantsIds[0],
      token
    );
  });

  test(
    '@ADM-T565 Edit role - Remove merchant (Merchant Admin with Network)',
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

      let roleId: string;
      await test.step('Create a role with 3 merchants first', async () => {
        await adminRolesAndPermissions.clickOnCreateRole();
        await adminRoleManagement.assertPresenceInCreateRoleForm();

        // Fill role name
        await adminRoleManagement.fillRoleName(roleName);

        await test.step('Choose Merchant as Access Type', async () => {
          await adminRoleManagement.selectAccessTypeOption(ACCESS_TYPE.network);
          await adminRoleManagement.assertSelectedAccessType(ACCESS_TYPE.network);
        });
        // Select network and merchants
        await adminRoleManagement.selectNetworkByName(networkName, selectedNetwork.id);
        await adminRoleManagement.selectNetworkMerchantsByName(
          selectedNetworkMerchants.map((merchant) => merchant.name)
        );
        // Select environments
        await adminRoleManagement.selectProductionEnvironment();
        await adminRoleManagement.selectSandboxEnvironment();

        // Set permissions for all merchants
        for (let i = 0; i < 3; i++) {
          const selectedPermissions = await adminRoleManagement.checkRandomPermissions(
            merchantsIds[i],
            2
          );
          permissions[merchantsIds[i]] = selectedPermissions;
        }

        // Save role
        await adminRoleManagement.saveRole();
        await adminRolesAndPermissions.assertRoleCreationSuccess(roleName);
        await adminRolesAndPermissions.assertRoleInRolesList(roleName);
      });

      await test.step('User clicks on Edit Role', async () => {
        await adminRolesAndPermissions.goToEditRole(roleName);
        // Extract roleId from current URL
        const currentUrl = page.url();
        roleId = currentUrl.split('/').pop() || '';
        await adminRoleManagement.assertPresenceInEditRoleForm(roleName, roleId);
      });

      await test.step('User removes one merchant from the role', async () => {
        // First verify all 3 merchants are currently selected
        await adminRoleManagement.assertSelectedNetworkMerchants(3, allNetworkMerchants.length);

        // Remove the third merchant
        const merchantsToSelect = selectedNetworkMerchants
          .slice(2, 3)
          .map((merchant) => merchant.name);
        await adminRoleManagement.selectNetworkMerchantsByName(merchantsToSelect);

        // Verify only 2 merchants are now selected
        await adminRoleManagement.assertSelectedNetworkMerchants(
          remainingMerchants.length,
          allNetworkMerchants.length
        );
      });

      await test.step('Save changes', async () => {
        await adminRoleManagement.saveChanges();
        await adminRolesAndPermissions.assertRoleEditionSuccess(roleName);
        await adminRolesAndPermissions.assertRoleInRolesList(roleName);
      });

      await test.step('Verify role details show only remaining merchants', async () => {
        await adminRolesAndPermissions.goToViewRoleDetails(roleName);

        // Validate network name
        await expect(adminRoleManagement.getRoleDetailNetworkField()).toContainText(networkName);

        // Validate that only the remaining 2 merchants are shown
        const commercesField = adminRoleManagement.getRoleDetailCommercesField();
        for (const merchantName of remainingMerchants) {
          await expect(commercesField).toContainText(merchantName);
        }

        // Validate that the removed merchant is NOT shown
        const removedMerchantName = selectedNetworkMerchants[2].name;
        await expect(commercesField).not.toContainText(removedMerchantName);
      });
    }
  );
});
