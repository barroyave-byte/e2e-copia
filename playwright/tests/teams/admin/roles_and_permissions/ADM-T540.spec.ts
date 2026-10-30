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
import { Merchant } from '@tests/teams/admin/helpers/rolesAndPermissions';

const configMerchant = new ConfigMerchant();

const roleName = `Role test ${faker.string.alphanumeric(5).toLowerCase()}`;
const permissions: Record<string, (keyof typeof RESOURCES | keyof typeof ACTIONS)[]> = {};
const environments: (keyof typeof ENVIRONMENTS)[] = [];

let merchant: Merchant;

test.describe('@regression Create a new role in a merchant without network as Superadmin', () => {
  test.beforeAll(async () => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchant = { id: merchantConfig.merchantId, name: merchantConfig.merchantName };
  });

  test(
    '@ADM-T540 Create a new role in a merchant without network as Superadmin',
    { tag: ['@admin', '@admin-preprod', '@team_admin', '@admin_smoke'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminRolesAndPermissions = new AdminRolesAndPermissionsPage(page);
      const adminRoleManagement = new AdminRoleManagementPage(page);

      await test.step('The user logs in the admin and goes to Roles and Permissions view', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchant.id);
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

      await test.step('Choose Merchant as Access Type', async () => {
        await adminRoleManagement.selectAccessTypeOption(ACCESS_TYPE.merchant, merchant.id);
        await adminRoleManagement.assertSelectedAccessType(ACCESS_TYPE.merchant);
      });

      await test.step('Choose a merchant', async () => {
        await adminRoleManagement.selectMerchantByName(merchant.name, merchant.id);
        await adminRoleManagement.assertSelectedMerchant(merchant.name);
      });

      await test.step('Select Production Environment and Sandbox Environment', async () => {
        await adminRoleManagement.selectProductionEnvironment();
        await adminRoleManagement.selectSandboxEnvironment();
        environments.push(ENVIRONMENTS.production);
        environments.push(ENVIRONMENTS.sandbox);
        await adminRoleManagement.assertProductionEnvironmentIsChecked();
        await adminRoleManagement.assertSandboxEnvironmentIsChecked();
      });

      await test.step('Check random permissions for the merchant', async () => {
        const selectedPermissions = await adminRoleManagement.checkRandomPermissions(
          merchant.id,
          4
        );
        await adminRoleManagement.assertPermissionsChecked(merchant.id, selectedPermissions);
        await adminRoleManagement.assertActivateButtonIsEnabled();
      });

      await test.step('Save the new role', async () => {
        await adminRoleManagement.saveRole();
        await adminRolesAndPermissions.assertRoleCreationSuccess(roleName);
        await adminRolesAndPermissions.assertRoleInRolesList(roleName);
      });

      await test.step('Verify role details', async () => {
        await adminRolesAndPermissions.goToViewRoleDetails(roleName);
        await adminRoleManagement.assertRoleDetails({
          roleName,
          merchants: [merchant.name],
          environments,
          permissions,
        });
        await adminRoleManagement.assertRoleDetailsAreReadOnly([merchant.id]);
      });
    }
  );
});
