import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import {
  ENVIRONMENTS,
  EDIT_BUTTON_IDS,
  RESOURCES,
  ACTIONS,
} from '@pages/admin/constants/rolesAndPermissions';
import { AdminRoleManagementPage } from '@pages/admin/roles_and_permissions/adminRoleManagementPage';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import { faker } from '@faker-js/faker';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import {
  Merchant,
  createNetworkFixture,
  selectMerchants,
  getMerchantIds,
  getMerchantNames,
  getRemainingMerchants,
} from '../helpers/rolesAndPermissions';

const configMerchant = new ConfigMerchant();

let userEmail: string;
let roleId: string;
const password = '123456';
const roleName = `Role test ${faker.string.alphanumeric(5).toLowerCase()}`;
const permissions: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]> = {};

let merchants: Merchant[];
let selectedNetwork: { id: string; name: string };
let networkName: string;
let selectedMerchants: Merchant[];
let merchantsIds: string[];
const environments: (keyof typeof ENVIRONMENTS)[] = [];

test.describe('@regression DEUNA Admin - Edit role - Add merchant (Merchant Admin with Network)', () => {
  test.beforeAll(async ({ merchantAuthService }) => {
    const fixture = await createNetworkFixture(configMerchant);
    merchants = fixture.merchants;
    selectedNetwork = { id: fixture.networkId, name: fixture.networkName };
    networkName = selectedNetwork.name;
    selectedMerchants = selectMerchants(merchants, 2);
    merchantsIds = getMerchantIds(merchants);

    const { token } = await merchantAuthService.merchantLogin();

    // Create a user for testing permissions after role edit
    userEmail = await apiCallNewman.createMerchantUserV3WithNetwork(
      'merchant_admin',
      'all',
      merchantsIds,
      selectedNetwork.id,
      token
    );
  });

  test(
    '@ADM-T562 Edit role - Add merchant (Merchant Admin with Network)',
    { tag: ['@admin', '@admin-preprod', '@team_admin', '@admin_smoke'] },
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

      await test.step('Create a new role', async () => {
        await adminRolesAndPermissions.clickOnCreateRole();
        await adminRoleManagement.assertPresenceInCreateRoleForm();
      });

      await test.step('Fill Role Name', async () => {
        await adminRoleManagement.assertRoleNameStepIsActive();
        await adminRoleManagement.fillRoleName(roleName);
        await adminRoleManagement.assertRoleNameIsFilled(roleName);
      });

      await test.step('Choose merchants from the user network', async () => {
        await adminRoleManagement.selectNetworkMerchantsByName(getMerchantNames(selectedMerchants));
        await adminRoleManagement.assertSelectedNetworkMerchants(
          selectedMerchants.length,
          merchants.length
        );
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
        for (const merchant of selectedMerchants) {
          const selectedPermissions = await adminRoleManagement.checkAllColumnMerchantPermissions(
            merchant.id
          );
          permissions[merchant.id] = selectedPermissions;
          await adminRoleManagement.assertPermissionsChecked(merchant.id, selectedPermissions);
        }
        await adminRoleManagement.assertActivateButtonIsEnabled();
      });

      await test.step('Save the new role', async () => {
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

      await test.step('User add merchants to the role', async () => {
        // Get remaining merchants that weren't initially selected
        const remainingMerchants = getRemainingMerchants(merchants, selectedMerchants);

        // Add the remaining merchants to the network selection
        await adminRoleManagement.selectNetworkMerchantsByName(
          getMerchantNames(remainingMerchants)
        );

        // Verify all merchants are now selected
        await adminRoleManagement.assertSelectedNetworkMerchants(
          merchants.length,
          merchants.length
        );

        // Add permissions for the newly added merchants
        for (const merchant of remainingMerchants) {
          const merchantPermissions = await adminRoleManagement.checkRandomPermissions(
            merchant.id,
            4
          );
          permissions[merchant.id] = merchantPermissions;
          await adminRoleManagement.assertPermissionsChecked(merchant.id, merchantPermissions);
        }
      });

      await test.step('Save changes', async () => {
        await adminRoleManagement.saveChanges();
        await adminRolesAndPermissions.assertRoleEditionSuccess(roleName);
        await adminRolesAndPermissions.assertRoleInRolesList(roleName);
      });

      await test.step('Verify role details with new permissions', async () => {
        await adminRolesAndPermissions.goToViewRoleDetails(roleName);

        // Now the role should have all merchants
        const allMerchants = getMerchantNames(merchants);
        const allMerchantIds = getMerchantIds(merchants);

        await adminRoleManagement.assertRoleDetails({
          roleName,
          merchants: allMerchants,
          environments,
          permissions,
          networkName,
        });

        await adminRoleManagement.assertRoleDetailsAreReadOnly(allMerchantIds);
      });

      await test.step('Verify user has updated permissions after merchant addition', async () => {
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();

        // Login as the user with the edited role
        await adminLoginPage.loginWithEmailAndPassword(userEmail, password);

        // Set merchant context to one of the newly added merchants
        const firstNewMerchant = getRemainingMerchants(merchants, selectedMerchants)[0];
        await adminHomePage.setMerchantIdSessionStorage(firstNewMerchant.id);

        // Verify the user can now access the newly added merchant
        const newMerchantPermissions = permissions[firstNewMerchant.id];
        await adminHomePage.assertVisibleModulesAccordingToPermissions(newMerchantPermissions);

        // Verify user can still access original merchants
        await adminHomePage.setMerchantIdSessionStorage(merchantsIds[0]);
        const originalPermissions = permissions[merchantsIds[0]];
        await adminHomePage.assertVisibleModulesAccordingToPermissions(originalPermissions);
      });
    }
  );
});
