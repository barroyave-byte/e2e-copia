import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as validationRefund from '@support/interfaces/refund';
import { NupayFormPage } from '@pages/explore/forms/nupayFormPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

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
    '@PI-T1716 Refund V2 para purchase con NUPay',
    { tag: ['@payments_integration', '@installments', '@team_payment_integration'] },
    async ({ page }) => {
      let planOptionId = '';
      const installments: number = 1;
      const nupayFormPage = new NupayFormPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');
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
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed', 5, 2000);
      });

      await test.step('The user initiates a refund request v2', async () => {
        await apiCallNewman.refundOrderV2(validationRefund.successRefund, privateKey, 2, false, {
          orderToken,
        }); //default is 5.28
        await adminOrderDetailsPage.assertPaymentStatus('partial_refunded', 5, 2000);
      });
    }
  );
});
