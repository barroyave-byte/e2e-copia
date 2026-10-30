import { expect, test } from '@support/fixtures';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as crypto from 'crypto';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { NupayFormPage } from '@pages/explore/forms/nupayFormPage';

let orderToken: string;
let orderId: string;
let merchantId: string;
let merchantToken: string;
let merchantName: string;
let privateKey: string;
let publicKey: string;

test.describe('@regression NuPay', () => {
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('NUPAY_PROCESSOR_NETWORK_BR');
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    const response = await emaService.tokenizeNupayOrder(privateKey, { variant: 'debit' });
    orderToken = response.data.token;
    orderId = response.data.order.order_id;
  });

  test(
    '@PI-T1670 Compra fallida de orden duplicada',
    { tag: ['@payments_integration', '@installments', '@team_payment_integration'] },
    async ({ page, paymentService, userAuthService }) => {
      let planOptionId = '';
      const installments: number = 1;
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

      await test.step('The purchase returns an error indicating that the order has already been processed', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        const response = await paymentService.purchaseV2(
          privateKey,
          userToken,
          {
            transaction_id: orderId,
            amount: 528,
            device_id: crypto.randomUUID(),
            order_token: orderToken,
            payer_info: { email: 'eposada@deuna.com' },
            payment_source: { method_type: 'nupay_debit', processor: 'NUPAY' },
          } as any,
          true
        );
        expect(response.status).toBe(400);
      });
    }
  );
});
