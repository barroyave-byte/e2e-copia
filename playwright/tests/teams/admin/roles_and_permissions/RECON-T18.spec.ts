import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import { AdminUserManagementPage } from '@pages/admin/roles_and_permissions/adminUserManagementPage';
import { faker } from '@faker-js/faker';
import { AdminReconciliationPage } from '@pages/admin/adminReconciliationPage';
import {
  ENVIRONMENTS,
  ROLE_OR_CUSTOM_PERMISSIONS,
} from '@pages/admin/constants/rolesAndPermissions';
import { AdminRoleManagementPage } from '@pages/admin/roles_and_permissions/adminRoleManagementPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { Merchant, createNetworkFixture } from '@tests/teams/admin/helpers/rolesAndPermissions';

const configMerchant = new ConfigMerchant();

let userEmail: string;
let newUserEmail: string;
const password = '123456';
let newUserPassword = '';
const roleName = `Recon Role ${faker.string.alphanumeric(5).toLowerCase()}`;
const environments: (keyof typeof ENVIRONMENTS)[] = [];
const selectedMerchants: string[] = [];

let selectedNetworkMerchants: Merchant[];
let selectedNetworkId: string;
let merchantsIds: string[];

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async ({ merchantAuthService }) => {
    const fixture = await createNetworkFixture(configMerchant);
    selectedNetworkMerchants = fixture.merchants;
    selectedNetworkId = fixture.networkId;
    merchantsIds = selectedNetworkMerchants.map((merchant) => merchant.id);

    const { token } = await merchantAuthService.merchantLogin();
    // Create user with a role and network access
    userEmail = await apiCallNewman.createMerchantUserV3WithNetwork(
      'merchant_admin',
      'all',
      merchantsIds,
      selectedNetworkId,
      token
    );
  });

  test(
    '@RECON-T18 Reconciliation Flow Permissions',
    {
      tag: ['@admin', '@admin-preprod', '@team_admin'],
    },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminRolesAndPermissions = new AdminRolesAndPermissionsPage(page);
      const adminUserManagement = new AdminUserManagementPage(page);
      const adminReconciliationsPage = new AdminReconciliationPage(page);
      const adminRoleManagement = new AdminRoleManagementPage(page);

      await test.step('The user logs in the admin and goes to Roles and Permissions', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantsIds[0]);
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
        const merchantNames = selectedNetworkMerchants.slice(0, 3).map((m) => m.name);
        selectedMerchants.push(...merchantNames);
        await adminRoleManagement.selectNetworkMerchantsByName(selectedMerchants);
      });

      const selectedMerchantsData = selectedNetworkMerchants.filter((merchant) =>
        selectedMerchants.includes(merchant.name)
      );

      await test.step('Go to environment selection step', async () => {
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

      await test.step('Check connections permissions (NOT reconciliations) for all merchants', async () => {
        for (const merchant of selectedMerchantsData) {
          await adminRoleManagement.checkSpecificResource('connections', merchant.id);
        }
      });

      await test.step('Save the new role', async () => {
        await adminRoleManagement.saveRole();
        await adminRolesAndPermissions.assertRoleCreationSuccess(roleName);
        await adminRolesAndPermissions.assertRoleInRolesList(roleName);
      });

      await test.step('Create a user and assign the role without reconciliation permissions', async () => {
        await adminRolesAndPermissions.goToUsersTab();
        await adminRolesAndPermissions.assertPresenceInUsersTab();
        await adminRolesAndPermissions.clickOnCreateUser();
        await adminUserManagement.assertPresenceInCreateUserForm();

        // Step 1: User info
        newUserEmail = faker.internet.email({ provider: 'deuna.com' });
        await adminUserManagement.assertUserInfoStepIsActive();
        await adminUserManagement.fillUserName('Test Recon User');
        await adminUserManagement.fillUserEmail(newUserEmail);

        // Step 2: Assign the created role
        await adminUserManagement.assertCustomRoleOrPermissionsStepIsActive();
        await adminUserManagement.chooseRoleOrPermissions(ROLE_OR_CUSTOM_PERMISSIONS.role);
        await adminUserManagement.selectRoleByName(roleName);
        await adminUserManagement.assertSelectedRole(roleName);

        await adminUserManagement.clickStepConfirmButton();

        // Confirm user creation
        await adminUserManagement.assertSaveUserConfirmationModalIsVisible();
        newUserPassword = await adminUserManagement.confirmSaveUserModal();
        await adminRolesAndPermissions.assertUserCreationSuccess(newUserEmail);
        await adminRolesAndPermissions.assertUserInUsersList(newUserEmail);
      });

      await test.step('logout and login with the new user', async () => {
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
        await adminLoginPage.assertLoginPageAsCurrentPage();
        await adminHomePage.setMerchantIdSessionStorage(merchantsIds[0]);
        await adminLoginPage.loginWithEmailAndPassword(newUserEmail, newUserPassword);
        await adminHomePage.assertConnectionsIsCurrentPage();
      });

      await test.step('validate flow without reconciliation permissions', async () => {
        await adminHomePage.assertNavigationButtonVisibility(
          adminHomePage.buttonReconciliations,
          false
        );
      });

      await test.step('logout as merchant user', async () => {
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
        await adminHomePage.setMerchantIdSessionStorage(merchantsIds[0]);
        await adminLoginPage.assertLoginPageAsCurrentPage();
      });

      // Add reconciliation view permission to the role
      await test.step('login as network user again and go to roles and permissions', async () => {
        await adminLoginPage.loginWithEmailAndPassword(userEmail, password);
        await adminHomePage.goToRolesAndPermissions();
        await adminRolesAndPermissions.assertPresenceInRolesAndPermissionsView();
      });

      await test.step('Edit the role to add reconciliation view permission', async () => {
        await adminRolesAndPermissions.goToRolesTab();
        await adminRolesAndPermissions.assertPresenceInRolesTab();
        await adminRolesAndPermissions.goToEditRole(roleName);

        const currentUrl = page.url();
        const roleId = currentUrl.split('/').pop() || '';
        await adminRoleManagement.assertPresenceInEditRoleForm(roleName, roleId);
      });

      await test.step('Add reconciliation view permission to all merchants', async () => {
        for (const merchant of selectedMerchantsData) {
          await adminRoleManagement.checkSpecificResource('reconciliations', merchant.id);
        }

        await adminRoleManagement.saveChanges();
        await adminRolesAndPermissions.assertRoleEditionSuccess(roleName);
      });

      await test.step('logout and login with the user again', async () => {
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
        await adminLoginPage.assertLoginPageAsCurrentPage();
        await adminHomePage.setMerchantIdSessionStorage(merchantsIds[0]);
        await adminLoginPage.loginWithEmailAndPassword(newUserEmail, newUserPassword);
        await adminHomePage.assertConnectionsIsCurrentPage();
      });

      await test.step('user goes to reconciliations', async () => {
        await adminHomePage.goToReconciliations();
        await adminHomePage.assertReconciliationsIsCurrentPage();
      });

      await test.step('validate flow for user with only reconciliations view permissions', async () => {
        await adminReconciliationsPage.goToSettlements();
        await adminReconciliationsPage.assertExportSettlementsButtonIsNotVisible();
      });

      await test.step('logout as merchant user', async () => {
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
        await adminLoginPage.assertLoginPageAsCurrentPage();
      });

      // Add export reconciliations permission to the role
      await test.step('login as network user again and go to roles and permissions', async () => {
        await adminHomePage.setMerchantIdSessionStorage(merchantsIds[0]);
        await adminLoginPage.loginWithEmailAndPassword(userEmail, password);
        await adminHomePage.goToRolesAndPermissions();
        await adminRolesAndPermissions.assertPresenceInRolesAndPermissionsView();
      });

      await test.step('Edit the role to add export reconciliation permission', async () => {
        await adminRolesAndPermissions.goToRolesTab();
        await adminRolesAndPermissions.assertPresenceInRolesTab();
        await adminRolesAndPermissions.goToEditRole(roleName);

        const currentUrl = page.url();
        const roleId = currentUrl.split('/').pop() || '';
        await adminRoleManagement.assertPresenceInEditRoleForm(roleName, roleId);
      });

      await test.step('Add export reconciliation permission to all merchants', async () => {
        for (const merchant of selectedMerchantsData) {
          await adminRoleManagement.checkSpecificAction('createEditReconciliations', merchant.id);
        }

        await adminRoleManagement.saveChanges();
        await adminRolesAndPermissions.assertRoleEditionSuccess(roleName);
      });

      await test.step('logout and login with the user again', async () => {
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
        await adminLoginPage.assertLoginPageAsCurrentPage();
        await adminHomePage.setMerchantIdSessionStorage(merchantsIds[0]);
        await adminLoginPage.loginWithEmailAndPassword(newUserEmail, newUserPassword);
        await adminHomePage.assertConnectionsIsCurrentPage();
      });

      await test.step('user goes to reconciliations', async () => {
        await adminHomePage.goToReconciliations();
        await adminHomePage.assertReconciliationsIsCurrentPage();
      });

      await test.step('user reconciliations validate its export permissions', async () => {
        await adminReconciliationsPage.goToSettlements();
        await adminReconciliationsPage.assertExportSettlementsButtonIsVisible();
      });
    }
  );
});
