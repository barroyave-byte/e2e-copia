import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as validationCapture from '@support/interfaces/capture';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as refundData from '@support/interfaces/refundV2';
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

const mpcConfigData = {
  timezone: 'America/Mexico_City',
  capture_cutoff_days: 7,
};

const purchaseAmount = 4000;

test.describe('@regression feature to validate with the automated test case', () => {
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
    '@PI-T2019 (1.0) Authorize → Capture Partial V2 → Refund Partial Multiple V1 ELAVON (before settlement)',
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
      });

      await test.step('Authorize', async () => {
        const body_purchase_v2 = CreateBody(creditCardData.elavonVisaSuccessfull);

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
        expect(settlement.raw_airline_data).not.toBeFalsy();
      });

      await test.step('Validate Partial Capture', async () => {
        const partialPayment = 2000;

        // do the capture
        const resultCaptureV2 = await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          partialPayment,
          undefined,
          { orderToken }
        );

        // validate capture
        validateCaptureV2({
          result: resultCaptureV2,
          invoiceStatus: StatusInvoice.PartialCapturing,
          transactionAmount: partialPayment,
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
        expect(transaction.amount).toEqual(partialPayment);

        // Validate Settlement
        const settlement = await validateSettlement(
          invoice.order_token,
          0,
          StatusTransaction.Authorized,
          StatusSettlement.Unsettled
        );
        expect(settlement.amount).toEqual(purchaseAmount);
        expect(settlement.raw_airline_data).not.toBeFalsy();
      });

      await test.step('Validate Partial Refund 1', async () => {
        const partialRefund = 500;

        const resultRefundV2 = await apiCallNewman.refundOrderV2(
          refundData.successRefundV2,
          privateKey,
          partialRefund,
          false,
          { orderToken }
        );

        validateRefundV2({
          result: resultRefundV2,
          transactionAmount: partialRefund,
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
        expect(transaction.amount).toEqual(partialRefund);

        // Validate Settlement
        const settlement = await validateSettlement(
          invoice.order_token,
          1,
          StatusTransaction.Refunding,
          StatusSettlement.Unsettled
        );
        expect(settlement.conciliation_id).toEqual(transaction.allTransactions[2].conciliation_id);
        expect(settlement.raw_airline_data).not.toBeFalsy();
      });

      await test.step('Validate Partial Refund 2', async () => {
        const partialRefund = 500;

        const resultRefundV2 = await apiCallNewman.refundOrderV2(
          refundData.successRefundV2,
          privateKey,
          partialRefund,
          false,
          { orderToken }
        );

        validateRefundV2({
          result: resultRefundV2,
          transactionAmount: partialRefund,
          transactionCurrency: 'USD',
          transactionStatus: StatusTransaction.Refunding,
          indexRefund: 1,
          skipTransactionId: true,
        });

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.PartialCapturing);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          3,
          TypeTransaction.Refund,
          StatusTransaction.Refunding
        );
        expect(transaction.amount).toEqual(partialRefund);

        // Validate Settlement
        const settlement = await validateSettlement(
          invoice.order_token,
          2,
          StatusTransaction.Refunding,
          StatusSettlement.Unsettled
        );
        expect(settlement.conciliation_id).toEqual(transaction.allTransactions[3].conciliation_id);
        expect(settlement.raw_airline_data).not.toBeFalsy();
      });
    }
  );
});
