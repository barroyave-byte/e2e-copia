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

let selectedNetworkMerchants: Merchant[];
let network: { id: string; name: string };
let merchantsIds: string[];

const permissions: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]> = {};
const environments: (keyof typeof ENVIRONMENTS)[] = [];
const selectedMerchants: string[] = [];

test.describe('@regression DEUNA Admin - Attempt to create a user without selecting at least one permission for each merchant', () => {
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
    '@ADM-T761 Attempt to create a user without selecting at least one permission for each merchant',
    { tag: ['@admin', '@admin-preprod', '@team_admin', '@admin_smoke'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const adminRolesAndPermissions = new AdminRolesAndPermissionsPage(page);
      const adminUserManagement = new AdminUserManagementPage(page);

      await test.step('The user logs in the admin and goes to Roles and Permissions view and goes to Users tab', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
        await adminHomePage.setMerchantIdSessionStorage(merchantsIds[0]);
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
        const merchantName2 = selectedNetworkMerchants[1].name;
        selectedMerchants.push(merchantName2);
        const merchantName3 = selectedNetworkMerchants[2].name;
        selectedMerchants.push(merchantName3);
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
        const merchantsToCheck = selectedMerchantsData.slice(0, 2);
        await Promise.all(
          merchantsToCheck.map(async (merchant, index) => {
            const amount = index === 0 ? 4 : 8;
            const selected = await adminUserManagement.checkRandomPermissions(merchant.id, amount);
            permissions[merchant.id] = selected;
          })
        );

        for (const merchant of merchantsToCheck) {
          await adminUserManagement.assertPermissionsChecked(merchant.id, permissions[merchant.id]);
        }
      });

      await test.step('Attempt to save the new user', async () => {
        await adminUserManagement.clickStepConfirmButton();
      });

      await test.step('Validate that the user cannot be created unless at least one permission is selected for each merchant', async () => {
        await adminUserManagement.assertMissingPermissionsErrorMessageIsVisible();
      });
    }
  );
});
