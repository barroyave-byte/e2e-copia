import { test, expect } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { AdminBatchProcessingPage } from '@pages/admin/adminBatchProcessing';
import { AdminOrderDetailsPage } from '../../pages/admin/orders/adminOrderDetailsPage';

import envConfig from '@support/envConfig';
import * as apiCallNewman from '@support/newman/apiCallNewman';

const configMerchant = new ConfigMerchant();

test.describe('@regression Batch Job Processing for Capture Transactions', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessorAuthorize,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T473 operation filter - Capture for an authorized transaction using Kushki',
    { tag: ['@admin_connection', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminBatchProcessingPage = new AdminBatchProcessingPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const urlAdmin = envConfig.ADMIN_URL;

      let batchJobFile;

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });
      await test.step('The user opens the widget and navigates to the payment page', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('The user enters the credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.kushkiVisaSuccessfull, {
          country: 'MX',
        });
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully with status processed', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('authorized', 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('authorized');
      });

      await test.step('The user goes to the batch processing page', async () => {
        await adminHomePage.goToBatchProcessing();
      });

      await test.step('The user clicks the upload batch job button', async () => {
        await adminBatchProcessingPage.clickUploadBatchJobButton();
      });

      await test.step('The user enters the batch job name', async () => {
        await adminBatchProcessingPage.setBatchJobNameInput('Authorize - Capture');
      });

      await test.step('The batch job refund file is created in memory using the order_id', async () => {
        const fileData = {
          transaction: {
            id: orderId,
            type: 'capture',
            currency: 'MXN',
            amount: 3000,
          },
          headers: {
            currency: 'currency',
            amount: 'amount_to_capture',
          },
        };
        batchJobFile = await adminBatchProcessingPage.createBatchJobFileInMemory(fileData);
        expect(batchJobFile).toBeDefined();
        console.log('Batch Job File created -> ', batchJobFile.toString());
      });

      await test.step('The user uploads the batch job file', async () => {
        await adminBatchProcessingPage.setBatchJobFileInput('capture.csv', batchJobFile);
      });

      await test.step('The user clicks the save batch job button', async () => {
        await adminBatchProcessingPage.clickSaveBatchJobButton();
      });

      await test.step('The user updates the batch job table', async () => {
        await adminBatchProcessingPage.assertStatusBatch('Procesando');
        await adminBatchProcessingPage.assertStatusBatch('Completado');
      });

      await test.step('The user goes to the batch processing page', async () => {
        await adminHomePage.goToBatchProcessing();
      });

      await test.step('The user goes to the batch processing page', async () => {
        await adminHomePage.filterByAction('capture');
      });
    }
  );
});
