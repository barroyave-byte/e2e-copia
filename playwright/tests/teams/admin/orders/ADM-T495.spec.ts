import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminRolesAndPermissionsPage } from '@pages/admin/roles_and_permissions/adminRolesAndPermissionsPage';
import { AdminUserManagementPage } from '@pages/admin/roles_and_permissions/adminUserManagementPage';

const configMerchant = new ConfigMerchant();

const userPassword = '123456';
let userEmail: string;

test.describe('@regression User with custom permissions - Total Refund with payment processor Kushki MX', () => {
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
    '@ADM-T495 User with custom permissions total refunds a transaction',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin', '@admin_smoke'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminRolesAndPermissions = new AdminRolesAndPermissionsPage(page);
      const adminUserManagement = new AdminUserManagementPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The superadmin user logs in', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The superadmin goes to roles and permisions page', async () => {
        await adminHomePage.goToRolesAndPermissions();
        await adminRolesAndPermissions.assertPresenceInRolesAndPermissionsView();
        await adminRolesAndPermissions.goToUsersTab();
        await adminRolesAndPermissions.assertPresenceInUsersTab();
      });

      await test.step('Select the user with the merchant_user role to edit by clicking on the Edit option in the menu', async () => {
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
        await adminRolesAndPermissions.assertUserEditionSuccess(userEmail.toLocaleLowerCase());
      });

      await test.step('Logout from admin', async () => {
        await adminHomePage.clickToMenuSettings();
        await adminHomePage.logout();
      });

      await test.step('The user navigates to the payment widget screen as guest user', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('The user inserts a credit card from DeunaNow', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.kushkiVisaSuccessfull, {
          country: 'MX',
        });
      });

      await test.step('The user clicks on pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminLoginPage.goToAdminLoginPage();
        await adminLoginPage.loginWithEmailAndPassword(userEmail, userPassword);
        await adminHomePage.assertAdminHomePageAsCurrentPage();
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });

      await test.step('The processed transaction is refunded', async () => {
        await adminOrderDetailsPage.refundTotalOrder();
        await adminOrderDetailsPage.assertPaymentStatus('refunded');
      });
    }
  );
});
