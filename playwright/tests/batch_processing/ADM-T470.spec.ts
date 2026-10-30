import { test, expect } from '@support/fixtures';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminBatchProcessingPage } from '@pages/admin/adminBatchProcessing';
import { AdminOrderDetailsPage } from '../../pages/admin/orders/adminOrderDetailsPage';

import envConfig from '@support/envConfig';

const configMerchant = new ConfigMerchant();

test.describe('@regression Batch Job Processing for Refund Transactions', () => {
  let merchantId: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
  });

  test(
    '@ADM-T470 upload incorrect file batch processing',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin'] },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminBatchProcessingPage = new AdminBatchProcessingPage(page);

      let batchJobFile;

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to the batch processing page', async () => {
        await adminHomePage.goToBatchProcessing();
      });

      await test.step('The user clicks the upload batch job button', async () => {
        await adminBatchProcessingPage.clickUploadBatchJobButton();
      });

      await test.step('The user enters the batch job name', async () => {
        await adminBatchProcessingPage.setBatchJobNameInput('incorrect file');
      });

      await test.step('The batch job refund file is created in memory using the order_id', async () => {
        const fileData = {
          transaction: {
            id: orderId,
            type: 'refund',
            currency: 'MXN',
            amount: 3000,
          },
          headers: {
            currency: 'currency',
            amount: 'amount_to_refund',
          },
        };
        batchJobFile = await adminBatchProcessingPage.createInvalidBatchJobFileInMemory(fileData);
        expect(batchJobFile).toBeDefined();
        console.log('Batch Job File created -> ', batchJobFile.toString());
      });

      await test.step('The user uploads the batch job file', async () => {
        await adminBatchProcessingPage.setBatchJobFileInput('refund.csv', batchJobFile);
      });

      await test.step('The user clicks the save batch job button', async () => {
        await adminBatchProcessingPage.clickSaveBatchJobButton();
      });

      await test.step('The user updates the batch job table', async () => {
        await adminBatchProcessingPage.assertStatusBatch('Rechazado');
      });
    }
  );
});
