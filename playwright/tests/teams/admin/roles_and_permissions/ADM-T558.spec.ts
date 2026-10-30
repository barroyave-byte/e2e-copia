import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import {
  RESOURCES,
  ACTIONS,
  ENVIRONMENTS,
  ROLE_OR_CUSTOM_PERMISSIONS,
} from '@pages/admin/constants/rolesAndPermissions';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import { AdminUserManagementPage } from '@pages/admin/roles_and_permissions/adminUserManagementPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { Merchant, createNetworkFixture } from '@tests/teams/admin/helpers/rolesAndPermissions';

const configMerchant = new ConfigMerchant();

let userEmail: string;
const password = '123456';
const newUserName = 'Usuario test';
const newUserEmail = EmailGenerator.generatePayerEmail();
let newUserPassword = '';
let selectedNetworkMerchants: Merchant[];
let network: { id: string; name: string };
let merchantsIds: string[];
const permissions: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]> = {};
const environments: (keyof typeof ENVIRONMENTS)[] = [];
const selectedMerchants: string[] = [];

test.describe('@regression DEUNA Admin - Create a user with access to only one network merchant using a network user with access to 3 merchants', () => {
  test.beforeAll(async ({ merchantAuthService }) => {
    const fixture = await createNetworkFixture(configMerchant);
    selectedNetworkMerchants = fixture.merchants;
    network = { id: fixture.networkId, name: fixture.networkName };
    merchantsIds = selectedNetworkMerchants.map((merchant) => merchant.id);

    const { token } = await merchantAuthService.merchantLogin();
    // Create user with a role and network access
    userEmail = await apiCallNewman.createMerchantUserV3WithNetwork(
      'merchant_admin',
      'all',
      merchantsIds,
      network.id,
      token
    );
  });

  test(
    '@ADM-T558 Create a user with access to only one network merchant using a network user with access to 3 merchants',
    { tag: ['@admin', '@admin-preprod', '@team_admin', '@admin_smoke'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminRolesAndPermissions = new AdminRolesAndPermissionsPage(page);
      const adminUserManagement = new AdminUserManagementPage(page);

      await test.step('The user logs in the admin and goes to Roles and Permissions view and goes to Users tab', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
        await adminHomePage.setMerchantIdSessionStorage(selectedNetworkMerchants[0].id);
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

      await test.step('Choose Custom permissions option', async () => {
        await adminUserManagement.chooseRoleOrPermissions(ROLE_OR_CUSTOM_PERMISSIONS.permissions);
        await adminUserManagement.assertPermissionsRadioIsChecked();
      });

      await test.step('Go to choose Access Type', async () => {
        await adminUserManagement.assertCommerceStepIsActive();
      });

      await test.step('User selects all the three merchants from the list', async () => {
        const merchantName1 = selectedNetworkMerchants[0].name;
        selectedMerchants.push(merchantName1);
        await adminUserManagement.selectNetworkMerchantsByName(selectedMerchants);
      });

      const selectedMerchantsData = selectedNetworkMerchants.filter((merchant) =>
        selectedMerchants.includes(merchant.name)
      );

      await test.step('Go to environment selection step', async () => {
        await adminUserManagement.assertSelectEnvironmentStepIsActive();
      });

      await test.step('Select Production Environment and Sandbox Environment', async () => {
        await adminUserManagement.selectProductionEnvironment();
        await adminUserManagement.selectSandboxEnvironment();
        environments.push(ENVIRONMENTS.production);
        environments.push(ENVIRONMENTS.sandbox);
        await adminUserManagement.assertProductionEnvironmentIsChecked();
        await adminUserManagement.assertSandboxEnvironmentIsChecked();
      });

      await test.step('Check random permissions for the merchants', async () => {
        await Promise.all(
          selectedMerchantsData.map(async (merchant, index) => {
            const amount = index === 0 ? 4 : 8;
            const selected = await adminUserManagement.checkRandomPermissions(merchant.id, amount);
            permissions[merchant.id] = selected;
          })
        );

        for (const merchant of selectedMerchantsData) {
          await adminUserManagement.assertPermissionsChecked(merchant.id, permissions[merchant.id]);
        }
      });

      await test.step('Save the new user', async () => {
        await adminUserManagement.clickStepConfirmButton();
        await adminUserManagement.assertSaveUserConfirmationModalIsVisible();
      });

      await test.step('Confirm the user creation modal', async () => {
        newUserPassword = await adminUserManagement.confirmSaveUserModal();
        await adminRolesAndPermissions.assertUserCreationSuccess(newUserEmail);
        await adminRolesAndPermissions.searchUserByEmail(newUserEmail);
        await adminRolesAndPermissions.assertUserInUsersList(newUserEmail);
      });

      await test.step('Verify user details', async () => {
        const merchantNames = selectedMerchantsData.map((merchant) => merchant.name);
        const merchantIds = selectedMerchantsData.map((merchant) => merchant.id);
        await adminRolesAndPermissions.goToViewUserDetails(newUserEmail);
        await adminUserManagement.assertUserDetails({
          userName: newUserName,
          userEmail: newUserEmail,
          roleOrPermissions: ROLE_OR_CUSTOM_PERMISSIONS.permissions,
          merchants: merchantNames,
          environments,
          permissions,
          networkName: network.name,
        });
        await adminUserManagement.assertUserDetailsAreReadOnly(merchantIds);
      });

      await test.step('User logs out', async () => {
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
      });

      await test.step('Log in as the new user and verify their permissions', async () => {
        await adminLoginPage.loginWithEmailAndPassword(newUserEmail, newUserPassword);
        const allPermissions: string[] = Object.values(permissions).flat();
        await adminHomePage.assertVisibleModulesAccordingToPermissions(allPermissions);
      });
    }
  );
});
