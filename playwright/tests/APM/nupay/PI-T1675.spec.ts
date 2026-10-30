import { test, expect } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { NupayFormPage } from '@pages/explore/forms/nupayFormPage';
import { faker } from '@faker-js/faker';

const configMerchant = new ConfigMerchant();
let orderToken: string;
let merchantId: string;
let merchantToken: string;
let merchantName: string;
let privateKey: string;
let publicKey: string;
let orderId: string;

test.describe('@regression NuPay', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const response = await emaService.tokenizeNupayOrder(privateKey);
    orderId = response.data.order.order_id;
    orderToken = response.data.token;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.nupayProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createNetwork(merchantId, merchantToken);
  });

  test(
    '@PI-T1675 Actualización de ID de la orden - NuPay',
    { tag: ['@payments_integration', '@installments', '@team_payment_integration'] },
    async ({ page, emaService }) => {
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

      await test.step('Validate that updating the order id of an already processed transaction is not allowed', async () => {
        const response = await emaService.updateNupayOrderId(
          privateKey,
          orderToken,
          faker.string.uuid(),
          true
        );
        expect((response.data as any).error.code).toBe('EMA-6004');
        expect((response.data as any).error.description).toBe(
          'cannot create an order already processed'
        );
      });
    }
  );
});
