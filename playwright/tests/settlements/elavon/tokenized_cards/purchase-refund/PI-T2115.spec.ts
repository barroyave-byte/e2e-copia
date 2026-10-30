import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as refundData from '@support/interfaces/refund';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { StatusInvoice, validateInvoice } from '@tests/order_validate/validate_invoice';
import { validateRefundV2 } from '@tests/order_validate/validate_refund_v2';
import { StatusSettlement, validateSettlement } from '@tests/order_validate/validate_settlements';
import {
  StatusTransaction,
  TypeTransaction,
  validateTransaction,
} from '@tests/order_validate/validate_transactions';
import { CreatePurchaseBodyV2WithCardId, CreatePurchaseOrderV1 } from '../../elavon_body';

const configMerchant = new ConfigMerchant();

const purchaseAmount = 4000;

test.describe('@regression feature to validate with the automated test case', () => {
  let userCardId: string;
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
      processorsConfig.elavonProcessorSettlement,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T2115 (1.0) Purchase V2 → Refund Partial V2 ELAVON (before settlement)',
    { tag: ['@settlement', '@team_payment_integration'] },
    async ({ emaService, paymentService }) => {
      let orderToken: string;
      let orderId: string;
      await test.step('Create Card', async () => {
        const user_id = crypto.randomUUID();
        userAuthToken = await apiCallNewman.loginGuest(merchantId, user_id, privateKey);
        const resultCreateCard = await apiCallNewman.createCard(
          user_id,
          userAuthToken,
          creditCardData.elavonVisaSuccessfull
        );

        expect(resultCreateCard).toHaveProperty('id');
        userCardId = resultCreateCard.id;
      });

      await test.step('Tokenize Order', async () => {
        const purchaseOrder = CreatePurchaseOrderV1();

        const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          purchaseOrder as unknown as TokenizeOrderRequestData
        );
        orderToken = tokenizeResponse.data.token;
        orderId = tokenizeResponse.data.order.order_id;

        expect(orderToken).not.toBeUndefined();
        expect(orderId).not.toBeUndefined();
      });

      await test.step('Purchase V2', async () => {
        const purchasePayload = CreatePurchaseBodyV2WithCardId(orderToken, userCardId);

        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, purchasePayload)
        ).data as any;
        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order).toBeDefined();
        expect(purchase_v2.order.currency).toEqual('USD');
        expect(purchase_v2.order.payment).toBeDefined();
        expect(purchase_v2.order.payment.data.status).toEqual(StatusInvoice.Processing);

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Processing);
        expect(invoice.amount).toEqual(purchaseAmount);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          0,
          TypeTransaction.Purchase,
          StatusTransaction.Processing
        );
        expect(transaction.amount).toEqual(invoice.amount);
        expect(transaction.conciliation_id.length).toEqual(15);

        // Validate Settlement
        const settlement = await validateSettlement(
          orderToken,
          0,
          StatusTransaction.Processing,
          StatusSettlement.Unsettled
        );
        expect(settlement.conciliation_id).toEqual(transaction.conciliation_id);
        expect(settlement.amount).toEqual(purchaseAmount);
      });

      await test.step('Refund Partial V2', async () => {
        const refundAmount = 2000;
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
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.PartialRefunding);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          1,
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
        expect(settlement.amount).toEqual(refundAmount);
      });
    }
  );
});
