import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import * as userData from '@support/interfaces/user_data';
import * as validationUser from '@support/interfaces/user_data';
import * as validationCapture from '@support/interfaces/capture';
import * as creditCardData from '@support/interfaces/credit_cards';
import { StatusInvoice, validateInvoice } from '../../order_validate/validate_invoice';
import {
  StatusTransaction,
  validateTransaction,
  TypeTransaction,
} from '../../order_validate/validate_transactions';
import { validateSizeSettlements } from '../../order_validate/validate_settlements';
import { validateCaptureV2 } from '@tests/order_validate/validate_capture_v2';
import {
  OrderBuilder,
  OrderConfig,
  OrderCurrency,
  OrderType,
} from '@tests/order_builder/order_builder';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

let privateKey: string;
let orderId: string;
let orderToken: string;
let merchantId: string;
let merchantName: string;
let merchantToken: string;
let userAuthToken: string;

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async () => {
    const config = await configMerchant.basicSetup('AR');
    merchantName = config.merchantName;
    privateKey = config.privateKey;
    merchantId = config.merchantId;
    merchantToken = config.merchantToken;

    await apiCallNewman.createNetwork(merchantId, merchantToken);
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.bambooAuthorizeProcessorMPC,
      merchantId,
      merchantToken
    );
  });
  test(
    '@PI-T2135 (1.0) MPC Offline final for amount Bamboo',
    { tag: ['@mpc', '@team_payment_integration'] },
    async ({ paymentService }) => {
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
          creditCard: creditCardData.bambooVisaSuccessfullAR,
        };
        const body_purchase_v2 = OrderBuilder(configOrder);
        orderId = body_purchase_v2.order.order_id;
        // Validate Response
        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, body_purchase_v2 as any)
        ).data as any;
        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order).toBeDefined();
        expect(purchase_v2.order.currency).toEqual(OrderCurrency.USD);
        expect(purchase_v2.order.payment).toBeDefined();
        expect(purchase_v2.order.payment.data.status).toEqual(StatusInvoice.Authorized);
        orderToken = purchase_v2.order_token;

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Authorized, false);
        expect(invoice.capture_cutoff_at).toBeFalsy();
        expect(invoice.amount).toEqual(13000);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          0,
          TypeTransaction.Authorize,
          StatusTransaction.Authorized
        );
        expect(transaction.amount).toEqual(invoice.amount);
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
          5000,
          undefined,
          { orderToken: orderToken }
        );

        validateCaptureV2({
          result: resultCaptureV2,
          invoiceStatus: StatusInvoice.PartialCapturing,
          transactionAmount: 5000,
          transactionCurrency: OrderCurrency.USD,
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
        expect(transaction.amount).toEqual(5000);
        expect(transaction.conciliation_id.length).toEqual(50);
        expect(transaction.raw_request).not.toBeFalsy();
        expect(transaction.raw_request).toHaveProperty('amount');
        expect(transaction.raw_request['amount']).toEqual(5000);
        expect(transaction.industry_specific_data).not.toBeFalsy();
        expect(transaction.industry_specific_data).toHaveProperty('airline_information');
        expect(transaction.industry_specific_data['airline_information']).not.toBeFalsy();
        expect(transaction.is_final_operation).toEqual(false);
      });

      await test.step('Capture Partial 2', async () => {
        const resultCaptureV2 = await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          5000,
          undefined,
          { orderToken: orderToken }
        );

        validateCaptureV2({
          result: resultCaptureV2,
          invoiceStatus: StatusInvoice.PartialCapturing,
          transactionAmount: 5000,
          transactionCurrency: OrderCurrency.USD,
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
        expect(transaction.amount).toEqual(5000);
        expect(transaction.conciliation_id.length).toEqual(50);
        expect(transaction.raw_request).not.toBeFalsy();
        expect(transaction.raw_request).toHaveProperty('amount');
        expect(transaction.raw_request['amount']).toEqual(5000);
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
          3000,
          undefined,
          { orderToken: orderToken }
        );

        validateCaptureV2({
          result: resultCaptureV2,
          invoiceStatus: StatusInvoice.Captured,
          transactionAmount: 3000,
          transactionCurrency: OrderCurrency.USD,
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
        expect(transaction.amount).toEqual(3000);
        expect(transaction.conciliation_id.length).toEqual(50);
        expect(transaction.raw_request).not.toBeFalsy();
        expect(transaction.raw_request).toHaveProperty('Amount');
        expect(transaction.raw_request['Amount']).toEqual(13000);
        expect(transaction.industry_specific_data).not.toBeFalsy();
        expect(transaction.industry_specific_data).toHaveProperty('airline_information');
        expect(transaction.industry_specific_data['airline_information']).not.toBeFalsy();
        expect(transaction.is_final_operation).toEqual(true);

        // Validate Settlement
        await validateSizeSettlements(invoice.order_token, 0);
      });
    }
  );
});
