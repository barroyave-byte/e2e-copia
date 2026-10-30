import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import {
  RESOURCES,
  ACTIONS,
  ENVIRONMENTS,
  ACCESS_TYPE,
} from '@pages/admin/constants/rolesAndPermissions';
import { AdminRoleManagementPage } from '@pages/admin/roles_and_permissions/adminRoleManagementPage';
import { faker } from '@faker-js/faker';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { Merchant, createNetworkFixture } from '@tests/teams/admin/helpers/rolesAndPermissions';

const configMerchant = new ConfigMerchant();

const roleName = `Role test ${faker.string.alphanumeric(5).toLowerCase()}`;
const permissions: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]> = {};
const environments: (keyof typeof ENVIRONMENTS)[] = [];

let selectedNetworkMerchants: Merchant[];
let selectedNetwork: { id: string; name: string };
let merchantsIds: string[];

test.describe('@regression Create a new role in a network merchant as Superadmin', () => {
  test.beforeAll(async () => {
    const fixture = await createNetworkFixture(configMerchant);
    selectedNetworkMerchants = fixture.merchants;
    selectedNetwork = { id: fixture.networkId, name: fixture.networkName };
    merchantsIds = selectedNetworkMerchants.map((merchant) => merchant.id);
  });

  test(
    '@ADM-T539 Create a new role in a network merchant as Superadmin',
    { tag: ['@admin', '@admin-preprod', '@team_admin', '@admin_smoke'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminRolesAndPermissions = new AdminRolesAndPermissionsPage(page);
      const adminRoleManagement = new AdminRoleManagementPage(page);

      await test.step('The user logs in the admin and goes to Roles and Permissions view', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantsIds[0]);
        await adminHomePage.goToRolesAndPermissions();
        await adminRolesAndPermissions.assertPresenceInRolesAndPermissionsView();
        await adminRolesAndPermissions.assertPresenceInRolesTab();
      });

      await test.step('Click on Create Rol button', async () => {
        await adminRolesAndPermissions.clickOnCreateRole();
        await adminRoleManagement.assertPresenceInCreateRoleForm();
      });

      await test.step('Fill Role Name', async () => {
        await adminRoleManagement.assertRoleNameStepIsActive();
        await adminRoleManagement.fillRoleName(roleName);
        await adminRoleManagement.assertRoleNameIsFilled(roleName);
      });

      await test.step('Choose Network as Access Type', async () => {
        await adminRoleManagement.selectAccessTypeOption(ACCESS_TYPE.network);
        await adminRoleManagement.assertSelectedAccessType(ACCESS_TYPE.network);
      });

      await test.step('Choose a Network', async () => {
        await adminRoleManagement.selectNetworkByName(selectedNetwork.name, selectedNetwork.id);
        await adminRoleManagement.assertSelectedNetwork(selectedNetwork.name);
      });

      await test.step('Choose all the network merchants', async () => {
        await adminRoleManagement.selectAllNetworkMerchants();
      });

      await test.step('Select Production Environment and Sandbox Environment', async () => {
        await adminRoleManagement.selectProductionEnvironment();
        await adminRoleManagement.selectSandboxEnvironment();
        environments.push(ENVIRONMENTS.production);
        environments.push(ENVIRONMENTS.sandbox);
        await adminRoleManagement.assertProductionEnvironmentIsChecked();
        await adminRoleManagement.assertSandboxEnvironmentIsChecked();
      });

      await test.step('Check random permissions for the merchants', async () => {
        await Promise.all(
          selectedNetworkMerchants.map(async (merchant, index) => {
            const amount = index === 0 ? 4 : 8;
            const selected = await adminRoleManagement.checkRandomPermissions(merchant.id, amount);
            permissions[merchant.id] = selected;
          })
        );

        for (const merchant of selectedNetworkMerchants) {
          await adminRoleManagement.assertPermissionsChecked(merchant.id, permissions[merchant.id]);
        }
      });

      await test.step('Save the new role', async () => {
        await adminRoleManagement.saveRole();
        await adminRolesAndPermissions.assertRoleCreationSuccess(roleName);
        await adminRolesAndPermissions.assertRoleInRolesList(roleName);
      });

      await test.step('Verify role details', async () => {
        const merchantNames = selectedNetworkMerchants.map((merchant) => merchant.name);
        const merchantIds = selectedNetworkMerchants.map((merchant) => merchant.id);
        await adminRolesAndPermissions.goToViewRoleDetails(roleName);
        await adminRoleManagement.assertRoleDetails({
          roleName,
          merchants: merchantNames,
          environments,
          permissions,
          networkName: selectedNetwork.name,
        });
        await adminRoleManagement.assertRoleDetailsAreReadOnly(merchantIds);
      });
    }
  );
});
