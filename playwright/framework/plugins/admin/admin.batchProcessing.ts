import { Context, FrameworkPlugin } from '../interface';
import { AdminBatchProcessingPage } from '@pages/admin/adminBatchProcessing';

export class PluginAdminBatchProcessing extends FrameworkPlugin {
  pluginBaseName = 'admin.batchProcessing';

  batchPage!: AdminBatchProcessingPage;

  setTestContext(context: Context) {
    super.setTestContext(context);
    this.batchPage = new AdminBatchProcessingPage(context.page);
  }

  /** @description Clicks the upload batch job button to open the batch job creation form. */
  async $tf_clickUploadBatchJobButton() {
    await this.batchPage.clickUploadBatchJobButton();
  }

  /** @description Fills the batch job name input with the provided name. */
  async $tf_setBatchJobName(params: { batchJobName: string }) {
    await this.batchPage.setBatchJobNameInput(params.batchJobName);
  }

  /** @description Creates a valid batch job CSV file in memory from the provided file data object. */
  async $tf_createBatchJobFile(params: { fileData: any }) {
    return await this.batchPage.createBatchJobFileInMemory(params.fileData);
  }

  /** @description Sets the batch job file input with the provided filename and CSV buffer. */
  async $tf_setBatchJobFileInput(params: { name: string; file: Buffer }) {
    await this.batchPage.setBatchJobFileInput(params.name, params.file);
  }

  /** @description Clicks the save/validate button to submit the batch job. */
  async $tf_clickSaveBatchJob() {
    await this.batchPage.clickSaveBatchJobButton();
  }

  /** @description Asserts that the batch job reaches the specified status, retrying by clicking the update table button. */
  async $tf_assertBatchStatus(params: { state: 'Procesando' | 'Completado' | 'Rechazado' }) {
    await this.batchPage.assertStatusBatch(params.state);
  }

  /** @description Clicks the update table button to refresh the batch jobs list. */
  async $tf_clickUpdateTable() {
    await this.batchPage.clickUpdateBatchJobTableButton();
  }
}
