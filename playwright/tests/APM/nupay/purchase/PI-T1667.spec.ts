import { test } from '@support/fixtures';
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
    const tokenized = await emaService.tokenizeNupayOrder(privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@PI-T1667 Compra con nupay_credit - 2 cuotas',
    { tag: ['@payments_integration', '@installments', '@team_payment_integration'] },
    async ({ page }) => {
      let planOptionId = '';
      const installments: number = 2;
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');
      const nupayFormPage = new NupayFormPage(page);
      let consentSuccessResponse: ReturnType<typeof nupayFormPage.listenForConsentSuccessResponse>;
      let paymentMethodsResponse: ReturnType<typeof nupayFormPage.listenForPaymentMethodsResponse>;

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
          'nupay_credit',
          paymentMethodsResponse
        );
        await nupayFormPage.selectPaymentMethodOption('NuPay Credit');
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
        await adminOrderDetailsPage.assertPaymentMethod('credit');
      });
    }
  );
});
