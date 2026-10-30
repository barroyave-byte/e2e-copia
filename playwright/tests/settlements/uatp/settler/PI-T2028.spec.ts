import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as userData from '@support/interfaces/user_data';
import * as validationUser from '@support/interfaces/user_data';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { StatusBatch, validateBatchResult } from '../../../order_validate/validate_batch';
import { validateCaptureV2 } from '@tests/order_validate/validate_capture_v2';
import { StatusInvoice, validateInvoice } from '../../../order_validate/validate_invoice';
import { StatusSettlement, validateSettlement } from '../../../order_validate/validate_settlements';
import * as refundData from '@support/interfaces/refund';
import {
  StatusTransaction,
  TypeTransaction,
  validateTransaction,
} from '../../../order_validate/validate_transactions';
import { CreateBody } from '../uatp_body';
import * as validationCapture from '@support/interfaces/capture';
import { getFileAccept } from './files/file_accepte';
import { validateRefundV2 } from '@tests/order_validate/validate_refund_v2';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const processor = processorsConfig.uatpProcessorSettlementAuthorize;

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    // Configure Merchant
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    // Create Merchant
    await apiCallNewman.createNetwork(merchantId, merchantToken);
    // Create Merchant Payment Processor
    await apiCallNewman.createPaymentProcessor(processor, merchantId, merchantToken);
  });

  test(
    '@PI-T2028 (1.0) Setter Flow Authorize + Capture + Refund UATP',
    { tag: ['@settlement', '@team_payment_integration'] },
    async ({ paymentService }) => {
      let orderToken: string;
      let orderId: string;
      await test.step('Register User', async () => {
        const email = EmailGenerator.generateRegisteredUserEmail();
        const registerUser = await apiCallNewman.registerUser(
          email,
          userData.userDataMX,
          validationUser.successUser,
          privateKey,
          merchantId
        );
        expect(registerUser).toHaveProperty('token');
        userAuthToken = registerUser.token;
      });

      await test.step('Purchase V2', async () => {
        const body_purchase_v2 = CreateBody(creditCardData.uatpSuccess);
        orderId = body_purchase_v2.order.order_id;

        // Validate Response
        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, body_purchase_v2 as any)
        ).data as any;
        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order).toBeDefined();
        expect(purchase_v2.order.currency).toEqual('MXN');
        expect(purchase_v2.order.payment).toBeDefined();
        expect(purchase_v2.order.payment.data.status).toEqual(StatusInvoice.Authorized);
        orderToken = purchase_v2.order_token;

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Authorized);
        expect(invoice.amount).toEqual(13000);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          0,
          TypeTransaction.Authorize,
          StatusTransaction.Authorized
        );
        expect(transaction.amount).toEqual(invoice.amount);
        expect(transaction.conciliation_id.length).toEqual(14);

        // Validate Settlement
        const settlement = await validateSettlement(
          purchase_v2.order_token,
          0,
          StatusTransaction.Authorized,
          StatusSettlement.Unsettled
        );
        expect(settlement.conciliation_id).toEqual(transaction.conciliation_id);
        expect(settlement.raw_data).not.toBeFalsy();
        expect(settlement.raw_airline_data).not.toBeFalsy();
      });

      await test.step('Capture V2 Total', async () => {
        const resultCaptureV2 = await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          13000,
          undefined,
          { orderToken }
        );

        validateCaptureV2({
          result: resultCaptureV2,
          invoiceStatus: StatusInvoice.Capturing,
          transactionAmount: 13000,
          transactionCurrency: 'MXN',
          transactionStatus: StatusTransaction.Capturing,
          indexCapture: 0,
        });

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Capturing);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          1,
          TypeTransaction.Capture,
          StatusTransaction.Capturing
        );
        expect(transaction.amount).toEqual(13000);

        // Validate Settlement
        const settlement = await validateSettlement(
          invoice.order_token,
          1,
          StatusTransaction.Capturing,
          StatusSettlement.Unsettled
        );
        expect(settlement.amount).toEqual(13000);
        expect(settlement.raw_data).not.toBeFalsy();
        expect(settlement.raw_airline_data).not.toBeFalsy();
      });

      await test.step('Settlement Part 1', async () => {
        // Create Settlement Batch
        const batch = await apiCallNewman.SettlementCreateBath(
          processor.payment_processor_id,
          false,
          merchantId,
          privateKey
        );
        expect(batch.batch_id).not.toBeFalsy();
        expect(batch.status).toEqual(StatusBatch.Unprocessed);
        expect(batch.processor_id).not.toBeFalsy();
        expect(batch.processor_id).toEqual(processor.payment_processor_id);
        expect(batch.processor_name).not.toBeFalsy();
        expect(batch.batch_external_reference_id).not.toBeFalsy();
        expect(batch.filter_merchant_payment_processor).toEqual(false);
        expect(batch.file_base).not.toBeUndefined();
        expect(batch.file_base.folder).not.toBeFalsy();
        expect(batch.file_base.date).not.toBeFalsy();
        expect(batch.file_base.name).not.toBeFalsy();

        // Validate Settlement File Base
        const fileKey = `${batch.file_base.folder}/${batch.processor_id}/${batch.file_base.date}/${batch.batch_id}/${batch.file_base.name}`;
        const statusFileBatch = await apiCallNewman.SettlementFileBase(fileKey, privateKey);
        expect(statusFileBatch.success).toBe(true);
        expect(statusFileBatch.size).toBeGreaterThan(0);
        expect(statusFileBatch.num_transactions).toEqual(1);

        // Validar estado del batch
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const batchResult = await validateBatchResult(batch.batch_id, StatusBatch.Processing);
        expect(batchResult.processor_id).toEqual(processor.payment_processor_id);

        // Subir archivo Fake
        console.log(`Subiendo archivo para el batch: ${batch.batch_id}`);
        const file64 = getFileAccept(batch.batch_id);
        await apiCallNewman.UploadFile(batch.processor_name, file64);

        // Validar estado del batch
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const batchResultStatusPurchase = await validateBatchResult(
          batch.batch_id,
          StatusBatch.Completed
        );
        expect(batchResultStatusPurchase.processor_id).toEqual(processor.payment_processor_id);

        // Validar estado de las transacciones en settlement
        const settlement = await validateSettlement(
          orderToken,
          1,
          StatusTransaction.Captured,
          StatusSettlement.Settled
        );

        // Validar estado de las transacciones en payment
        await validateTransaction(
          settlement.invoice_id,
          1,
          TypeTransaction.Capture,
          StatusTransaction.Captured
        );

        await validateInvoice(settlement.order_token, settlement.order_id, StatusInvoice.Captured);
      });

      await test.step('Refund Total', async () => {
        // Refund Total
        const resultRefundV2 = await apiCallNewman.refundOrderV2(
          refundData.successRefund,
          privateKey,
          0,
          false,
          { orderToken }
        );

        validateRefundV2({
          result: resultRefundV2,
          transactionAmount: 13000,
          transactionCurrency: 'MXN',
          transactionStatus: StatusTransaction.Refunding,
          indexRefund: 0,
        });

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Refunding);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          2,
          TypeTransaction.Refund,
          StatusTransaction.Refunding
        );
        expect(transaction.amount).toEqual(13000);

        // Validate Settlement
        const settlement = await validateSettlement(
          invoice.order_token,
          2,
          StatusTransaction.Refunding,
          StatusSettlement.Unsettled
        );
        expect(settlement.conciliation_id).toEqual(transaction.allTransactions[2].conciliation_id);
        expect(settlement.amount).toEqual(13000);
        expect(settlement.raw_data).not.toBeFalsy();
        expect(settlement.raw_airline_data).not.toBeFalsy();
      });

      await test.step('Settlement Part 2', async () => {
        // Create Settlement Batch
        const batch = await apiCallNewman.SettlementCreateBath(
          processor.payment_processor_id,
          false,
          merchantId,
          privateKey
        );
        expect(batch.batch_id).not.toBeFalsy();
        expect(batch.status).toEqual(StatusBatch.Unprocessed);
        expect(batch.processor_id).not.toBeFalsy();
        expect(batch.processor_id).toEqual(processor.payment_processor_id);
        expect(batch.processor_name).not.toBeFalsy();
        expect(batch.batch_external_reference_id).not.toBeFalsy();
        expect(batch.filter_merchant_payment_processor).toEqual(false);
        expect(batch.file_base).not.toBeUndefined();
        expect(batch.file_base.folder).not.toBeFalsy();
        expect(batch.file_base.date).not.toBeFalsy();
        expect(batch.file_base.name).not.toBeFalsy();

        // Validate Settlement File Base
        const fileKey = `${batch.file_base.folder}/${batch.processor_id}/${batch.file_base.date}/${batch.batch_id}/${batch.file_base.name}`;
        const statusFileBatch = await apiCallNewman.SettlementFileBase(fileKey, privateKey);
        expect(statusFileBatch.success).toBe(true);
        expect(statusFileBatch.size).toBeGreaterThan(0);
        expect(statusFileBatch.num_transactions).toEqual(1);

        // Validar estado del batch
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const batchResult = await validateBatchResult(batch.batch_id, StatusBatch.Processing);
        expect(batchResult.processor_id).toEqual(processor.payment_processor_id);

        // Subir archivo Fake
        console.log(`Subiendo archivo para el batch: ${batch.batch_id}`);
        const file64 = getFileAccept(batch.batch_id);
        await apiCallNewman.UploadFile(batch.processor_name, file64);

        // Validar estado del batch
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const batchResultStatusPurchase = await validateBatchResult(
          batch.batch_id,
          StatusBatch.Completed
        );
        expect(batchResultStatusPurchase.processor_id).toEqual(processor.payment_processor_id);

        // Validar estado de las transacciones en settlement
        const settlement = await validateSettlement(
          orderToken,
          2,
          StatusTransaction.Refunded,
          StatusSettlement.Settled
        );

        // // Validar estado de las transacciones en payment
        await validateTransaction(
          settlement.invoice_id,
          2,
          TypeTransaction.Refund,
          StatusTransaction.Refunded
        );

        await validateInvoice(settlement.order_token, settlement.order_id, StatusInvoice.Refunded);
      });
    }
  );
});
