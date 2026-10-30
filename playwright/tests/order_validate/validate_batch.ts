import { expect } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';

export enum StatusBatch {
  Unprocessed = 'unprocessed',
  Processing = 'processing',
  Completed = 'completed',
  Error = 'error',
}

/**
 * Waits for the batch to reach `statusBatch`. The settler moves it asynchronously after the file
 * upload: a single read 5 s later found it still `processing` in PI-T2027 (run
 * regression-stg-cca02f6a), while the retry, a few seconds slower, saw `completed`.
 */
export async function validateBatchResult(
  batchID: string,
  statusBatch: StatusBatch
): Promise<apiCallNewman.ResultGetBatch> {
  await expect
    .poll(async () => (await apiCallNewman.GetBatch(batchID)).status, {
      message: `Batch ${batchID} never reached status ${statusBatch}`,
      timeout: 60_000,
      intervals: [1_000, 2_000, 5_000],
    })
    .toBe(statusBatch);
  const batchResultStatusPurchase = await apiCallNewman.GetBatch(batchID);
  expect(batchResultStatusPurchase).toBeDefined();
  expect(batchResultStatusPurchase.batch_id).toEqual(batchID);
  expect(batchResultStatusPurchase.status).toEqual(statusBatch);
  return batchResultStatusPurchase;
}

export function validateBatch(
  batch: apiCallNewman.ResultCreateBatch,
  processorId: number,
  batchStatus: StatusBatch
): void {
  expect(batch.batch_id).not.toBeFalsy();
  expect(batch.status).toEqual(batchStatus);
  expect(batch.processor_id).not.toBeFalsy();
  expect(batch.processor_id).toEqual(processorId);
  expect(batch.processor_name).not.toBeFalsy();
  expect(batch.batch_external_reference_id).not.toBeFalsy();
  expect(batch.filter_merchant_payment_processor).toEqual(false);
  expect(batch.file_base).not.toBeUndefined();
  expect(batch.file_base.folder).not.toBeFalsy();
  expect(batch.file_base.date).not.toBeFalsy();
  expect(batch.file_base.name).not.toBeFalsy();
}

export function validateBatchFileStatus(
  batchFile: apiCallNewman.ResultStatusFileBatch,
  txIndex: number,
  success?: boolean
): void {
  expect(batchFile.success).toBe(true);
  expect(batchFile.num_transactions).toEqual(txIndex);
  if (success) {
    expect(batchFile.size).toBeGreaterThan(0);
  } else {
    expect(batchFile.size).toEqual(0);
  }
}
