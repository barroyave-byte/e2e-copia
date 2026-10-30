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
import {
  StatusSettlement,
  validateSettlement,
  validateSizeSettlements,
} from '../../order_validate/validate_settlements';
import { validateCaptureV2 } from '@tests/order_validate/validate_capture_v2';
import {
  OrderBuilder,
  OrderConfig,
  OrderCurrency,
  OrderType,
} from '@tests/order_builder/order_builder';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

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
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.uatpProcessorMPCOfflineSettlement,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T2159 (1.0) MPC Offline final for amount UATP',
    { tag: '@mpc' },
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
          order_currency: OrderCurrency.MXN,
          creditCard: creditCardData.uatpSuccess,
        };
        const body_purchase_v2 = OrderBuilder(configOrder);
        orderId = body_purchase_v2.order.order_id;
        // Validate Response
        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, body_purchase_v2 as any)
        ).data as any;
        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order).toBeDefined();
        expect(purchase_v2.order.currency).toEqual(OrderCurrency.MXN);
        expect(purchase_v2.order.payment).toBeDefined();
        expect(purchase_v2.order.payment.data.status).toEqual(StatusInvoice.Authorized);
        orderToken = purchase_v2.order_token;

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Authorized);
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
        expect(transaction.conciliation_id.length).toEqual(14);
        expect(transaction.industry_specific_data).not.toBeFalsy();
        expect(transaction.industry_specific_data).toHaveProperty('airline_information');
        expect(transaction.industry_specific_data['airline_information']).not.toBeFalsy();
        expect(transaction.is_final_operation).toEqual(false);

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

      await test.step('Capture Total', async () => {
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
          transactionCurrency: OrderCurrency.MXN,
          transactionStatus: StatusTransaction.Capturing,
          indexCapture: 0,
        });

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Capturing);
        expect(invoice.capture_cutoff_at).toBeFalsy();

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          1,
          TypeTransaction.Capture,
          StatusTransaction.Capturing
        );
        expect(transaction.amount).toEqual(13000);
        expect(transaction.conciliation_id.length).toEqual(14);
        expect(transaction.raw_request).not.toBeFalsy();
        expect(transaction.raw_request).toHaveProperty('amount');
        expect(transaction.raw_request['amount']).toEqual('13000');
        expect(transaction.industry_specific_data).not.toBeFalsy();
        expect(transaction.industry_specific_data).toHaveProperty('airline_information');
        expect(transaction.industry_specific_data['airline_information']).not.toBeFalsy();
        expect(transaction.is_final_operation).toEqual(true);

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
    }
  );
});
