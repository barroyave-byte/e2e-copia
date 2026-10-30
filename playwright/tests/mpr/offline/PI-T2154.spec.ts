import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import * as userData from '@support/interfaces/user_data';
import * as validationUser from '@support/interfaces/user_data';
import * as validationCapture from '@support/interfaces/capture';
import * as validationRefund from '@support/interfaces/refund';
import * as creditCardData from '@support/interfaces/credit_cards';
import { StatusInvoice, validateInvoice } from '../../order_validate/validate_invoice';
import {
  StatusTransaction,
  validateTransaction,
  TypeTransaction,
} from '../../order_validate/validate_transactions';
import { validateSizeSettlements } from '../../order_validate/validate_settlements';
import { validateRefundV2 } from '@tests/order_validate/validate_refund_v2';
import { validateCaptureV2 } from '@tests/order_validate/validate_capture_v2';
import {
  OrderBuilder,
  OrderConfig,
  OrderCurrency,
  OrderType,
} from '@tests/order_builder/order_builder';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const PURCHASE_AMOUNT = 13000;
const PARTIAL_AMOUNT = 5000;
const PARTIAL_FINAL_AMOUNT = 3000;

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    // Configure Merchant
    const merchant = await configMerchant.basicSetup('AR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    // Create Merchant Payment Processor
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.bambooAuthorizeProcessorMPC_MPR,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T2154 (1.0) MPR Offline: MPC -> MPR (final for cutoff)',
    { tag: '@mpr' },
    async ({ paymentService }) => {
      let orderToken: string;
      let orderId: string;
      const email = EmailGenerator.generateRegisteredUserEmail();
      await test.step('Register User', async () => {
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

      await test.step('Authorize', async () => {
        const configOrder: OrderConfig = {
          email: email,
          order_type: OrderType.AIRLINE_ORDER,
          order_currency: OrderCurrency.USD,
          creditCard: creditCardData.bambooVisaSuccessfull,
        };
        const body_purchase_v2 = OrderBuilder(configOrder);
        orderId = body_purchase_v2.order.order_id;
        // Validate Response
        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, body_purchase_v2 as any)
        ).data as any;
        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order).toBeDefined();
        expect(purchase_v2.order.currency).toEqual('USD');
        expect(purchase_v2.order.payment).toBeDefined();
        expect(purchase_v2.order.payment.data.status).toEqual(StatusInvoice.Authorized);
        orderToken = purchase_v2.order_token;

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Authorized, false);
        expect(invoice.capture_cutoff_at).toBeFalsy();
        expect(invoice.amount).toEqual(PURCHASE_AMOUNT);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          0,
          TypeTransaction.Authorize,
          StatusTransaction.Authorized
        );
        expect(transaction.amount).toEqual(PURCHASE_AMOUNT);
        expect(transaction.conciliation_id.length).toEqual(50);
        expect(transaction.industry_specific_data).not.toBeFalsy();
        expect(transaction.industry_specific_data).toHaveProperty('airline_information');
        expect(transaction.industry_specific_data['airline_information']).not.toBeFalsy();
        expect(transaction.is_final_operation).toEqual(false);

        // Validate Settlement
        validateSizeSettlements(invoice.order_token, 0);
      });

      await test.step('Capture Partial 1', async () => {
        const resultCaptureV2 = await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          PARTIAL_AMOUNT,
          undefined,
          { orderToken }
        );

        validateCaptureV2({
          result: resultCaptureV2,
          invoiceStatus: StatusInvoice.PartialCapturing,
          transactionAmount: PARTIAL_AMOUNT,
          transactionCurrency: 'USD',
          transactionStatus: StatusTransaction.Capturing,
          indexCapture: 0,
        });

        // Validate Invoice
        const invoice = await validateInvoice(
          orderToken,
          orderId,
          StatusInvoice.PartialCapturing,
          false
        );
        expect(invoice.capture_cutoff_at).not.toBeFalsy();

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          1,
          TypeTransaction.Capture,
          StatusTransaction.Capturing
        );
        expect(transaction.amount).toEqual(PARTIAL_AMOUNT);
        expect(transaction.conciliation_id.length).toEqual(50);
        expect(transaction.raw_request).not.toBeFalsy();
        expect(transaction.raw_request).toHaveProperty('amount');
        expect(transaction.raw_request['amount']).toEqual(PARTIAL_AMOUNT);
        expect(transaction.industry_specific_data).not.toBeFalsy();
        expect(transaction.industry_specific_data).toHaveProperty('airline_information');
        expect(transaction.industry_specific_data['airline_information']).not.toBeFalsy();
        expect(transaction.is_final_operation).toEqual(false);

        // Validate Settlement
        await validateSizeSettlements(invoice.order_token, 0);
      });

      await test.step('Capture Partial 2', async () => {
        const resultCaptureV2 = await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          PARTIAL_AMOUNT,
          undefined,
          { orderToken }
        );

        validateCaptureV2({
          result: resultCaptureV2,
          invoiceStatus: StatusInvoice.PartialCapturing,
          transactionAmount: PARTIAL_AMOUNT,
          transactionCurrency: 'USD',
          transactionStatus: StatusTransaction.Capturing,
          indexCapture: 1,
        });

        // Validate Invoice
        const invoice = await validateInvoice(
          orderToken,
          orderId,
          StatusInvoice.PartialCapturing,
          false
        );
        expect(invoice.capture_cutoff_at).not.toBeFalsy();

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          2,
          TypeTransaction.Capture,
          StatusTransaction.Capturing
        );
        expect(transaction.amount).toEqual(PARTIAL_AMOUNT);
        expect(transaction.conciliation_id.length).toEqual(50);
        expect(transaction.raw_request).not.toBeFalsy();
        expect(transaction.raw_request).toHaveProperty('amount');
        expect(transaction.raw_request['amount']).toEqual(PARTIAL_AMOUNT);
        expect(transaction.industry_specific_data).not.toBeFalsy();
        expect(transaction.industry_specific_data).toHaveProperty('airline_information');
        expect(transaction.industry_specific_data['airline_information']).not.toBeFalsy();
        expect(transaction.is_final_operation).toEqual(false);

        // Validate Settlement
        await validateSizeSettlements(invoice.order_token, 0);
      });

      await test.step('Capture Partial 3 Total', async () => {
        const resultCaptureV2 = await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          PARTIAL_FINAL_AMOUNT,
          undefined,
          { orderToken }
        );

        validateCaptureV2({
          result: resultCaptureV2,
          invoiceStatus: StatusInvoice.Captured,
          transactionAmount: PARTIAL_FINAL_AMOUNT,
          transactionCurrency: 'USD',
          transactionStatus: StatusTransaction.Captured,
          indexCapture: 2,
        });

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Captured, false);
        expect(invoice.capture_cutoff_at).toBeFalsy();

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          3,
          TypeTransaction.Capture,
          StatusTransaction.Captured
        );
        expect(transaction.amount).toEqual(PARTIAL_FINAL_AMOUNT);
        expect(transaction.conciliation_id.length).toEqual(50);
        expect(transaction.raw_request).not.toBeFalsy();
        expect(transaction.raw_request).toHaveProperty('Amount');
        expect(transaction.raw_request['Amount']).toEqual(PURCHASE_AMOUNT);
        expect(transaction.industry_specific_data).not.toBeFalsy();
        expect(transaction.industry_specific_data).toHaveProperty('airline_information');
        expect(transaction.industry_specific_data['airline_information']).not.toBeFalsy();
        expect(transaction.is_final_operation).toEqual(true);

        // Validate Settlement
        await validateSizeSettlements(invoice.order_token, 0);
      });

      await test.step('Refund Partial 1', async () => {
        const resultRefundV2 = await apiCallNewman.refundOrderV2(
          validationRefund.successRefund,
          privateKey,
          PARTIAL_AMOUNT,
          false,
          { orderToken }
        );

        validateRefundV2({
          result: resultRefundV2,
          transactionAmount: PARTIAL_AMOUNT,
          transactionCurrency: 'USD',
          transactionStatus: StatusTransaction.Refunding,
          indexRefund: 0,
        });

        // Validate Invoice
        const invoice = await validateInvoice(
          orderToken,
          orderId,
          StatusInvoice.PartialRefunding,
          false
        );
        expect(invoice.refund_cutoff_at).not.toBeFalsy();

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          4,
          TypeTransaction.Refund,
          StatusTransaction.Refunding
        );
        expect(transaction.amount).toEqual(PARTIAL_AMOUNT);
        expect(transaction.conciliation_id.length).toEqual(50);
        expect(transaction.raw_request).not.toBeFalsy();
        expect(transaction.raw_request).toHaveProperty('amount');
        expect(transaction.raw_request['amount']).toEqual(PARTIAL_AMOUNT);
        expect(transaction.industry_specific_data).not.toBeFalsy();
        expect(transaction.industry_specific_data).toHaveProperty('airline_information');
        expect(transaction.industry_specific_data['airline_information']).not.toBeFalsy();
        expect(transaction.is_final_operation).toEqual(false);

        // Validate Settlement
        await validateSizeSettlements(invoice.order_token, 0);
      });

      await test.step('Refund Partial 2', async () => {
        const resultRefundV2 = await apiCallNewman.refundOrderV2(
          validationRefund.successRefund,
          privateKey,
          PARTIAL_AMOUNT,
          false,
          { orderToken }
        );

        validateRefundV2({
          result: resultRefundV2,
          transactionAmount: PARTIAL_AMOUNT,
          transactionCurrency: 'USD',
          transactionStatus: StatusTransaction.Refunding,
          indexRefund: 1,
        });

        // Validate Invoice
        const invoice = await validateInvoice(
          orderToken,
          orderId,
          StatusInvoice.PartialRefunding,
          false
        );
        expect(invoice.refund_cutoff_at).not.toBeFalsy();

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          5,
          TypeTransaction.Refund,
          StatusTransaction.Refunding
        );
        expect(transaction.amount).toEqual(PARTIAL_AMOUNT);
        expect(transaction.conciliation_id.length).toEqual(50);
        expect(transaction.raw_request).not.toBeFalsy();
        expect(transaction.raw_request).toHaveProperty('amount');
        expect(transaction.raw_request['amount']).toEqual(PARTIAL_AMOUNT);
        expect(transaction.industry_specific_data).not.toBeFalsy();
        expect(transaction.industry_specific_data).toHaveProperty('airline_information');
        expect(transaction.industry_specific_data['airline_information']).not.toBeFalsy();
        expect(transaction.is_final_operation).toEqual(false);

        // Validate Settlement
        await validateSizeSettlements(invoice.order_token, 0);
      });
    }
  );
});
