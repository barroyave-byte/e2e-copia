import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as userData from '@support/interfaces/user_data';
import * as validationUser from '@support/interfaces/user_data';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { StatusBatch, validateBatchResult } from '../../../order_validate/validate_batch';
import { StatusInvoice, validateInvoice } from '../../../order_validate/validate_invoice';
import { StatusSettlement, validateSettlement } from '../../../order_validate/validate_settlements';
import {
  StatusTransaction,
  TypeTransaction,
  validateTransaction,
} from '../../../order_validate/validate_transactions';
import { CreateBody } from '../uatp_body';
import { getFileAccept } from './files/file_accepte';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const processor = processorsConfig.uatpProcessorSettlement;

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
    '@PI-T2027 (1.0) Setter Flow Purchase + Refund UATP',
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
        expect(purchase_v2.order.payment.data.status).toEqual(StatusInvoice.Processing);
        orderToken = purchase_v2.order_token;
        console.log(`ORDER_TOKEN: ${orderToken}`);

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Processing);
        expect(invoice.amount).toEqual(13000);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          0,
          TypeTransaction.Purchase,
          StatusTransaction.Processing
        );
        expect(transaction.amount).toEqual(invoice.amount);
        expect(transaction.conciliation_id.length).toEqual(14);

        // Validate Settlement
        const settlement = await validateSettlement(
          purchase_v2.order_token,
          0,
          StatusTransaction.Processing,
          StatusSettlement.Unsettled
        );
        expect(settlement.conciliation_id).toEqual(transaction.conciliation_id);
        expect(settlement.raw_data).not.toBeFalsy();
        expect(settlement.raw_airline_data).not.toBeFalsy();
      });

      await test.step('Settlement', async () => {
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
          0,
          StatusTransaction.Processed,
          StatusSettlement.Settled
        );

        // Validar estado de las transacciones en payment
        await validateTransaction(
          settlement.invoice_id,
          0,
          TypeTransaction.Purchase,
          StatusTransaction.Processed
        );

        await validateInvoice(settlement.order_token, settlement.order_id, StatusInvoice.Processed);
      });
    }
  );
});
