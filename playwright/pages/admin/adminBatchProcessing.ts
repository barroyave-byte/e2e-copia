import { CommonsActions } from '@pages/commonActions';
import { expect, Locator, Page } from '@playwright/test';
import { retryOperationWithAction } from '@support/utils/retries';

export class AdminBatchProcessingPage extends CommonsActions {
  protected page: Page;

  readonly buttonUploadBatchJob: Locator;
  readonly inputBatchJobName: Locator;
  readonly inputBatchJobFile: Locator;
  readonly buttonSaveBatchJob: Locator;
  readonly buttonUpdateBatchJobTable: Locator;
  private lastBatchStatus?: string;
  private lastBatchId?: string;

  constructor(page: Page) {
    super(page);
    this.page = page;

    this.buttonUploadBatchJob = page.locator('[data-testid="btnUploadFile"]');
    this.inputBatchJobName = page.getByTestId('inputBatchName');
    this.inputBatchJobFile = page.getByTestId('inputUploadFile');
    this.buttonSaveBatchJob = page.locator('[data-testid="btnSaveBatch"]');
    this.buttonUpdateBatchJobTable = page.getByTestId('batch-processing-button-refresh');
  }

  async clickUploadBatchJobButton(): Promise<void> {
    await expect(this.buttonUploadBatchJob, 'Subir lote')
      .toBeVisible()
      .then(() => this.buttonUploadBatchJob.click());
  }

  async setBatchJobNameInput(batchJobName: string): Promise<void> {
    await expect(this.inputBatchJobName, 'Ingrese un nombre').toBeVisible();
    await this.inputBatchJobName.fill(batchJobName);
  }

  async createBatchJobFileInMemory(fileData: any) {
    const batchID = Math.floor(Math.random() * 100000);
    const data = `
batchID=${batchID},transactionType=${fileData.transaction.type},
,,
transaction_id,${fileData.headers.currency},${fileData.headers.amount}
${fileData.transaction.id},${fileData.transaction.currency},${fileData.transaction.amount}
`;
    return Buffer.from(data);
  }

  async createInvalidBatchJobFileInMemory(fileData: any) {
    const batchID = Math.floor(Math.random() * 100000);
    const data = `
test=${batchID},data=${fileData.transaction.type},
,,
transaction,${fileData.headers.currency},${fileData.headers.amount}
${fileData.transaction.id},${fileData.transaction.currency},${fileData.transaction.amount}
`;
    return Buffer.from(data);
  }

  async setBatchJobFileInput(name: string, file: Buffer): Promise<void> {
    await this.inputBatchJobFile.setInputFiles({
      name: name,
      mimeType: 'text/csv',
      buffer: file,
    });
  }

  async clickSaveBatchJobButton(): Promise<void> {
    const batchResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes('/batch-transactions') && response.request().method() === 'POST'
    );

    await expect(this.buttonSaveBatchJob, 'Validar').toBeVisible({ timeout: 10000 });
    await this.buttonSaveBatchJob.click();
    const { batch_id: batchId, status } = await (await batchResponse).json();
    this.lastBatchId = batchId;
    this.lastBatchStatus = status;
  }

  async assertStatusBatch(state: 'Procesando' | 'Completado' | 'Rechazado') {
    const expectedStatus = {
      Procesando: 'processing',
      Completado: 'completed',
      Rechazado: 'rejected',
    }[state];

    if (this.lastBatchStatus === expectedStatus) {
      await expect(this.lastBatchStatus).toBe(expectedStatus);
      return;
    }

    if (!this.lastBatchId) {
      throw new Error('The batch creation response did not include a batch_id');
    }

    const locator = this.page
      .getByTestId(`batch-processing-cell-status-${this.lastBatchId}`)
      .getByText(state, { exact: true });
    await retryOperationWithAction(
      this.page,
      locator,
      5,
      4000,
      async () => await this.clickUpdateBatchJobTableButton()
    );
  }

  async clickUpdateBatchJobTableButton(): Promise<void> {
    await expect(this.buttonUpdateBatchJobTable, 'Update batch table').toBeVisible({
      timeout: 10000,
    });
    await this.buttonUpdateBatchJobTable.click();
  }
}
