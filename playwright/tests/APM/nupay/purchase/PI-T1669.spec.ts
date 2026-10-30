import { test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { NupayFormPage } from '@pages/explore/forms/nupayFormPage';

test.describe('@regression NuPay', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('NUPAY_PROCESSOR_NETWORK_BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeNupayOrder(privateKey, { variant: 'debit' });
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PI-T1669 Compra con nupay_debit',
    {
      tag: [
        '@payments_integration',
        '@installments',
        '@admin_connection',
        '@admin-preprod',
        '@team_admin',
        '@team_payment_integration',
        '@team_enterprise',
      ],
    },
    async ({ page }) => {
      let planOptionId = '';
      const installments: number = 1;
      const adminHomePage = new AdminHomePage(page, 'PT');
      const adminLoginPage = new AdminLoginPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');
      const nupayFormPage = new NupayFormPage(page);
      let consentSuccessResponse: ReturnType<typeof nupayFormPage.listenForConsentSuccessResponse>;
      let paymentMethodsResponse: ReturnType<typeof nupayFormPage.listenForPaymentMethodsResponse>;

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });
      await test.step('The user open the widget and navigate to forms for fill nupay form ', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        paymentMethodsResponse = nupayFormPage.listenForPaymentMethodsResponse();
        consentSuccessResponse = nupayFormPage.listenForConsentSuccessResponse(orderToken, orderId);
        await nupayFormPage.fillDocumentAndClickOnAssignConsent('58188896454');
        await nupayFormPage.assertPaymentMethodsResponse(paymentMethodsResponse);
      });

      await test.step('The user select NuPay Credit as payment method', async () => {
        await nupayFormPage.clickOnSelectPaymentMethod(consentSuccessResponse);
        planOptionId = await nupayFormPage.getPlanOptionIdForInstallments(
          installments,
          'nupay_debit',
          paymentMethodsResponse
        );
        await nupayFormPage.selectPaymentMethodOption('NuPay Debit');
      });

      await test.step('The user click on pay', async () => {
        await nupayFormPage.clickPay(planOptionId);
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        await nupayFormPage.assertOrderStatusRequestPurchase('processing', 200);
      });

      await test.step('It validates that the fraud decision is respectively correct: processor and status', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed', 6, 4000);
        await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.nupay);
        await adminOrderDetailsPage.assertNumberOfInstallments(installments);
        await adminOrderDetailsPage.assertPaymentMethod('debit');
      });
    }
  );
});
