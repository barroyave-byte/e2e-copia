import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminOrdersPage } from '@pages/admin/orders/adminOrdersPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import { AdminUserManagementPage } from '@pages/admin/roles_and_permissions/adminUserManagementPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

const configMerchant = new ConfigMerchant();

const userPassword = '123456';
let userEmail: string;

test.describe('@regression Managing Order Details actions via custom permissions', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantAuthService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;

    const { token } = await merchantAuthService.merchantLogin();
    userEmail = await apiCallNewman.createMerchantUserV3WithoutNetwork(
      'merchant_user',
      'all',
      merchantId,
      token
    );
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PAYM-T2214 Historial de Pago no visible para usuarios tipo USER',
    { tag: ['@admin', '@merchant_user', '@admin_connection', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrdersPage = new AdminOrdersPage(page);
      const adminRolesAndPermissions = new AdminRolesAndPermissionsPage(page);
      const adminUserManagement = new AdminUserManagementPage(page);
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      await test.step('The admin goes to Orders', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.selectMerchant(merchantName, merchantId);
      });

      await test.step('The user navigates to the payment widget screen as registered user', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('User validates payment form is shown', async () => {
        await paymentDeunaNowPage.assertUserSeePaymentForm();
      });

      await test.step('User enters credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.kushkiVisaSuccessfull, {
          country: 'MX',
        });
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('The checkout shows the screen with the order completed and message "¡Gracias por elegirnos!"', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
      });

      await test.step('The admin goes to Orders', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The admin opens the first order and sees payment actions', async () => {
        await adminOrdersPage.assertOrdersLoaded(1);

        const orderDetailsPage = await adminOrdersPage.clickOnFirstOrder();
        const newAdminOrderDetailsPage = new AdminOrderDetailsPage(orderDetailsPage);
        await newAdminOrderDetailsPage.assertActionableButtonVisible();
        await newAdminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
      });

      await test.step('The admin goes to roles and permissions page', async () => {
        await adminHomePage.goToRolesAndPermissions();
        await adminRolesAndPermissions.assertPresenceInRolesAndPermissionsView();
        await adminRolesAndPermissions.goToUsersTab();
        await adminRolesAndPermissions.assertPresenceInUsersTab();
      });

      await test.step('Select the user to edit by clicking on the Edit option in the menu', async () => {
        await adminRolesAndPermissions.searchUserByEmail(userEmail.toLocaleLowerCase());
        await adminRolesAndPermissions.goToEditUser(userEmail);
      });

      await test.step('Add the Orders view and actions permissions to the merchant_user', async () => {
        await adminUserManagement.checkResource('orders', merchantId);
        await adminUserManagement.checkAction('editPaymentOperations', merchantId);
        await adminUserManagement.clickStepConfirmButton();
      });

      await test.step('Confirm user update', async () => {
        await adminUserManagement.confirmEditUserRequest();
      });

      await test.step('The admin should logout', async () => {
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
      });

      await test.step('The merchant_user should login with the new information', async () => {
        await adminLoginPage.goToAdminLoginPage();
        await adminLoginPage.loginWithEmailAndPassword(userEmail, userPassword);
        await adminHomePage.assertAdminHomePageAsCurrentPage();
      });

      await test.step('The merchant_user opens the first order and sees the permitted payment actions', async () => {
        await adminOrdersPage.assertOrdersLoaded(1);

        const orderDetailsPage = await adminOrdersPage.clickOnFirstOrder();
        const newAdminOrderDetailsPage = new AdminOrderDetailsPage(orderDetailsPage);
        await newAdminOrderDetailsPage.setMerchantSessionStorage(merchantId);

        await newAdminOrderDetailsPage.assertActionableButtonVisible();
      });
    }
  );
});
