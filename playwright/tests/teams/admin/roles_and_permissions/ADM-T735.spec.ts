import { expect, test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import { AdminUserManagementPage } from '@pages/admin/roles_and_permissions/adminUserManagementPage';
import { faker } from '@faker-js/faker';
import {
  DEFAULT_SUPERADMIN_EMAIL,
  DEFAULT_SUPERADMIN_PASSWORD,
} from '@pages/admin/constants/commons';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CreateBody } from '@tests/settlements/uatp/uatp_body';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { ENVIRONMENTS } from '@pages/admin/constants/rolesAndPermissions';
import * as crypto from 'crypto';

const configMerchant = new ConfigMerchant();

let email = faker.internet.email({
  provider: 'deuna.com',
});

let newUserPassword = '';
const newUserName = 'Test admin';

test.describe('@regression Granting Orders view permissions to a User', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let networkName: string;
  let networkId: string;
  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    privateKey = merchant.privateKey;
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    const network = await apiCallNewman.createNetwork(merchantId, merchantToken);
    networkName = network.networkName;
    networkId = network.networkId;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.uatpProcessorSettlement,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T735 [Edit user] Superadmin edits user and grants orders view permission',
    {
      tag: ['@admin', '@team_admin', '@admin-preprod'],
    },
    async ({ page, paymentService }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminRolesAndPermissions = new AdminRolesAndPermissionsPage(page);
      const adminUserManagement = new AdminUserManagementPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);

      await test.step('Purchase V2', async () => {
        const userAuthToken = await apiCallNewman.loginGuest(
          merchantId,
          crypto.randomUUID(),
          privateKey
        );
        const body_purchase_v2 = CreateBody(creditCardData.uatpSuccess);
        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, body_purchase_v2 as any)
        ).data;
        // Validate Response
        expect(purchase_v2).toBeDefined();
      });

      // Create merchant user without orders view permission
      await test.step('The superadmin user logs in', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to roles and permissions page', async () => {
        await adminHomePage.goToRolesAndPermissions();
        await adminRolesAndPermissions.assertPresenceInRolesAndPermissionsView();
        await adminRolesAndPermissions.goToUsersTab();
        await adminRolesAndPermissions.assertPresenceInUsersTab();
      });

      await test.step('user create merchant_user without orders permission', async () => {
        await adminRolesAndPermissions.goToCreateUserView();
        newUserPassword = await adminUserManagement.createUser({
          name: newUserName,
          email,
          roleOrPermissions: 'permissions',
          networkName,
          networkId,
          merchantNames: [merchantName],
          environments: ['production', 'sandbox'] as (keyof typeof ENVIRONMENTS)[],
          permissions: {
            [merchantId]: ['connections', 'editConnections'],
          },
        });
      });

      await test.step('logout as superadmin', async () => {
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
        await adminLoginPage.assertLoginPageAsCurrentPage();
      });

      await test.step('login with the new merchant user', async () => {
        await adminLoginPage.loginWithEmailAndPassword(email, newUserPassword);
        await adminHomePage.assertConnectionsIsCurrentPage();
        await adminHomePage.page.evaluate(() => window.localStorage.clear());
      });

      await test.step('go to login page', async () => {
        await adminLoginPage.goToAdminLoginPage();
      });

      await test.step('login as superadmin again and go to roles and permissions', async () => {
        await adminLoginPage.loginWithEmailAndPassword(
          DEFAULT_SUPERADMIN_EMAIL,
          DEFAULT_SUPERADMIN_PASSWORD
        );
        await adminHomePage.goToRolesAndPermissions();
        await adminRolesAndPermissions.assertPresenceInRolesAndPermissionsView();
        await adminRolesAndPermissions.goToUsersTab();
        await adminRolesAndPermissions.assertPresenceInUsersTab();
      });

      await test.step('Select the user with the merchant_user role to edit by clicking on the Edit option in the menu', async () => {
        await adminRolesAndPermissions.searchUserByEmail(email.toLocaleLowerCase());
        await adminRolesAndPermissions.goToEditUser(email);
      });

      await test.step('Give view orders permission and save changes', async () => {
        await adminUserManagement.checkResource('orders', merchantId);
        await adminUserManagement.clickStepConfirmButton();
      });

      await test.step('Click the Confirm button in the confirmation modal', async () => {
        await adminUserManagement.confirmEditUserRequest();
        await adminRolesAndPermissions.assertUserEditionSuccess(email.toLocaleLowerCase());
      });

      await test.step('logout as superadmin', async () => {
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
        await adminLoginPage.assertLoginPageAsCurrentPage();
      });

      await test.step('login with the edited user', async () => {
        await adminLoginPage.loginWithEmailAndPassword(email, newUserPassword);
        await adminHomePage.assertAdminHomePageAsCurrentPage();
      });

      await test.step('user goes to orders', async () => {
        await adminHomePage.goToOrders();
        await adminOrdersPage.assertPresenceInOrdersView();
      });

      await test.step('go to order details view and validate Payment History button access', async () => {
        await adminOrdersPage.assertOrdersLoaded(1);

        const orderDetailsPage = await adminOrdersPage.clickOnFirstOrder();

        const adminOrderDetails = new AdminOrderDetailsPage(orderDetailsPage);
        await adminOrderDetails.clickOnPaymentHistoryButton();
        // TODO(release admin 2.0): Restore payment history content validation when history data is available.
      });
    }
  );
});
