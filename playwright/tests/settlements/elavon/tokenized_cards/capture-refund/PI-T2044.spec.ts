import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as validationCapture from '@support/interfaces/capture';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as refundData from '@support/interfaces/refund';
import * as userData from '@support/interfaces/user_data';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { validateCaptureV2 } from '@tests/order_validate/validate_capture_v2';
import { validateRefundV2 } from '@tests/order_validate/validate_refund_v2';
import { StatusInvoice, validateInvoice } from '../../../../order_validate/validate_invoice';
import {
  StatusSettlement,
  validateSettlement,
} from '../../../../order_validate/validate_settlements';
import {
  StatusTransaction,
  TypeTransaction,
  validateTransaction,
} from '../../../../order_validate/validate_transactions';
import { CreateBody } from '../../elavon_body';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const purchaseAmount = 4000;

test.describe('@regression feature to validate with the automated test case', () => {
  let userCardId: string;
  let userAuthId: string;
  let userAuthToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    // Configure Merchant
    const merchant = await configMerchant.basicSetup('US');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    // Create Merchant
    await apiCallNewman.createNetwork(merchantId, merchantToken);
    // Create Merchant Payment Processor
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.elavonProcessorAuthorizeSettlementMPC,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T2044 (1.0) Authorize → Capture Partial V2 → Refund Partial Multiple V2 ELAVON (before settlement)',
    { tag: ['@settlement', '@team_payment_integration'] },
    async ({ paymentService }) => {
      let orderToken: string;
      let orderId: string;
      await test.step('Register User', async () => {
        const email = EmailGenerator.generateRegisteredUserEmail();
        const registerUser = await apiCallNewman.registerUser(
          email,
          userData.userDataUS,
          userData.successUser,
          privateKey,
          merchantId
        );

        // Validate User has token
        expect(registerUser).toHaveProperty('token');
        userAuthToken = registerUser.token;
        userAuthId = registerUser.user_id;
      });

      await test.step('Create Card', async () => {
        const resultCreateCard = await apiCallNewman.createCard(
          userAuthId,
          userAuthToken,
          creditCardData.elavonVisaSuccessfull
        );

        expect(resultCreateCard).toHaveProperty('id');
        userCardId = resultCreateCard.id;
      });

      await test.step('Authorize V2', async () => {
        const body_purchase_v2 = CreateBody(null, userCardId);

        // Do the Purchase
        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, body_purchase_v2 as any)
        ).data as any;
        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order).toBeDefined();
        expect(purchase_v2.order.currency).toEqual('USD');
        expect(purchase_v2.order.payment).toBeDefined();
        expect(purchase_v2.order.payment.data.status).toEqual(StatusInvoice.Authorized);

        orderToken = purchase_v2.order_token;
        orderId = purchase_v2.order.order_id;

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Authorized);
        expect(invoice.amount).toEqual(purchaseAmount);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          0,
          TypeTransaction.Authorize,
          StatusTransaction.Authorized
        );
        expect(transaction.amount).toEqual(invoice.amount);
        expect(transaction.conciliation_id.length).toEqual(15);

        // Validate Settlement
        const settlement = await validateSettlement(
          purchase_v2.order_token,
          0,
          StatusTransaction.Authorized,
          StatusSettlement.Unsettled
        );
        expect(settlement.conciliation_id).toEqual(transaction.conciliation_id);
        expect(settlement.amount).toEqual(purchaseAmount);
        expect(settlement.raw_airline_data).not.toBeFalsy();
      });

      await test.step('Capture Partial V2', async () => {
        const partialAmount = 2000;

        const resultCaptureV2 = await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          partialAmount,
          undefined,
          { orderToken }
        );

        // validate capture
        validateCaptureV2({
          result: resultCaptureV2,
          invoiceStatus: StatusInvoice.PartialCapturing,
          transactionAmount: partialAmount,
          transactionCurrency: 'USD',
          transactionStatus: StatusTransaction.Capturing,
          indexCapture: 0,
          skipTransactionId: true,
        });

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.PartialCapturing);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          1,
          TypeTransaction.Capture,
          StatusTransaction.Capturing
        );
        expect(transaction.amount).toEqual(partialAmount);

        // Validate Settlement
        const settlement = await validateSettlement(
          invoice.order_token,
          0,
          StatusTransaction.Authorized,
          StatusSettlement.Unsettled
        );
        expect(settlement.amount).toEqual(purchaseAmount);
        expect(settlement.conciliation_id).toEqual(transaction.allTransactions[0].conciliation_id);
        expect(settlement.raw_airline_data).not.toBeFalsy();
      });

      await test.step('Refund Partial 1 V2', async () => {
        const refundAmount = 1000;

        const resultRefundV2 = await apiCallNewman.refundOrderV2(
          refundData.successRefund,
          privateKey,
          refundAmount,
          false,
          { orderToken }
        );

        validateRefundV2({
          result: resultRefundV2,
          transactionAmount: refundAmount,
          transactionCurrency: 'USD',
          transactionStatus: StatusTransaction.Refunding,
          indexRefund: 0,
          skipTransactionId: true,
        });

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.PartialCapturing);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          2,
          TypeTransaction.Refund,
          StatusTransaction.Refunding
        );
        expect(transaction.amount).toEqual(refundAmount);

        // Validate Settlement
        const settlement = await validateSettlement(
          invoice.order_token,
          1,
          StatusTransaction.Refunding,
          StatusSettlement.Unsettled
        );
        expect(settlement.conciliation_id).toEqual(transaction.conciliation_id);
        expect(settlement.raw_airline_data).not.toBeFalsy();
      });

      await test.step('Refund Partial 2 V2', async () => {
        const refundAmount = 1000;

        const resultRefundV2 = await apiCallNewman.refundOrderV2(
          refundData.successRefund,
          privateKey,
          refundAmount,
          false,
          { orderToken }
        );

        validateRefundV2({
          result: resultRefundV2,
          transactionAmount: refundAmount,
          transactionCurrency: 'USD',
          transactionStatus: StatusTransaction.Refunding,
          indexRefund: 1,
          skipTransactionId: true,
        });

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Refunding);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          3,
          TypeTransaction.Refund,
          StatusTransaction.Refunding
        );
        expect(transaction.amount).toEqual(refundAmount);

        // Validate Settlement
        const settlement = await validateSettlement(
          invoice.order_token,
          2,
          StatusTransaction.Refunding,
          StatusSettlement.Unsettled
        );
        expect(settlement.conciliation_id).toEqual(transaction.conciliation_id);
        expect(settlement.raw_airline_data).not.toBeFalsy();
      });

      await test.step('Refund Partial 3 V2', async () => {
        const refundAmount = 2000;
        const previousRefundAmount = 1000;

        await apiCallNewman.refundOrderV2(
          refundData.errorRefundOrderAuthorized,
          privateKey,
          refundAmount,
          false,
          { orderToken }
        );

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Refunding);

        // Validate Settlement
        const settlement = await validateSettlement(
          invoice.order_token,
          2,
          StatusTransaction.Refunding,
          StatusSettlement.Unsettled
        );
        expect(settlement.amount).toEqual(previousRefundAmount);
      });
    }
  );
});
