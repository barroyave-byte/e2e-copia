import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { RESOURCES, ACTIONS, ENVIRONMENTS } from '@pages/admin/constants/rolesAndPermissions';
import { AdminRoleManagementPage } from '@pages/admin/roles_and_permissions/adminRoleManagementPage';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import { faker } from '@faker-js/faker';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { Merchant, createNetworkFixture } from '@tests/teams/admin/helpers/rolesAndPermissions';

const configMerchant = new ConfigMerchant();

let selectedNetworkMerchants: Merchant[];
let selectedNetwork: { id: string; name: string };
let selectedNetworkId: string;
let merchantsIds: string[];

let userEmail: string;
const password = '123456';
const roleName = `Role test ${faker.string.alphanumeric(5).toLowerCase()}`;
const permissions: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]> = {};
const environments: (keyof typeof ENVIRONMENTS)[] = [];
const selectedMerchants: string[] = [];

test.describe('@regression DEUNA Admin - Create a role in one network merchant as a user who has access to two network merchants', () => {
  test.beforeAll(async ({ merchantAuthService }) => {
    const fixture = await createNetworkFixture(configMerchant);
    selectedNetworkMerchants = fixture.merchants;
    selectedNetwork = { id: fixture.networkId, name: fixture.networkName };
    selectedNetworkId = selectedNetwork.id;
    merchantsIds = [selectedNetworkMerchants[0].id, selectedNetworkMerchants[1].id];

    const { token } = await merchantAuthService.merchantLogin();
    // Create user with a role and access to two network merchants
    userEmail = await apiCallNewman.createMerchantUserV3WithNetwork(
      'merchant_admin',
      'all',
      merchantsIds,
      selectedNetworkId,
      token
    );
  });

  test(
    '@ADM-T546 Create a role in one network merchant as a user who has access to two network merchants',
    { tag: ['@admin', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminRolesAndPermissions = new AdminRolesAndPermissionsPage(page);
      const adminRoleManagement = new AdminRoleManagementPage(page);

      await test.step('The user logs in the admin and goes to Roles and Permissions', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
        await adminHomePage.setMerchantIdSessionStorage(merchantsIds[0]);
        await adminLoginPage.loginWithEmailAndPassword(userEmail, password);
        await adminHomePage.goToRolesAndPermissions();
        await adminRolesAndPermissions.assertPresenceInRolesAndPermissionsView();
        await adminRolesAndPermissions.assertPresenceInRolesTab();
      });

      await test.step('User clicks on Create Role button', async () => {
        await adminRolesAndPermissions.clickOnCreateRole();
        await adminRoleManagement.assertPresenceInCreateRoleForm();
      });

      await test.step('Fill Role Name', async () => {
        await adminRoleManagement.assertRoleNameStepIsActive();
        await adminRoleManagement.fillRoleName(roleName);
        await adminRoleManagement.assertRoleNameIsFilled(roleName);
      });

      await test.step('User selects all the three merchants from the list', async () => {
        const merchantName1 = selectedNetworkMerchants[0].name;
        selectedMerchants.push(merchantName1);
        await adminRoleManagement.selectNetworkMerchantsByName(selectedMerchants);
      });

      const selectedMerchantsData = selectedNetworkMerchants.filter((merchant) =>
        selectedMerchants.includes(merchant.name)
      );

      await test.step('Go to environment selection', async () => {
        await adminRoleManagement.assertSelectEnvironmentStepIsActive();
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
          selectedMerchantsData.map(async (merchant, index) => {
            const amount = index === 0 ? 4 : 8;
            const selected = await adminRoleManagement.checkRandomPermissions(merchant.id, amount);
            permissions[merchant.id] = selected;
          })
        );

        for (const merchant of selectedMerchantsData) {
          await adminRoleManagement.assertPermissionsChecked(merchant.id, permissions[merchant.id]);
        }
      });

      await test.step('Save the new role', async () => {
        await adminRoleManagement.saveRole();
        await adminRolesAndPermissions.assertRoleCreationSuccess(roleName);
        await adminRolesAndPermissions.assertRoleInRolesList(roleName);
      });

      await test.step('Verify role details', async () => {
        const merchantNames = selectedMerchantsData.map((merchant) => merchant.name);
        const merchantIds = selectedMerchantsData.map((merchant) => merchant.id);
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
