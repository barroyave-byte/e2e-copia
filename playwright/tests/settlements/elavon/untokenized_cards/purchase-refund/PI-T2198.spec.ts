import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as refundData from '@support/interfaces/refund';
import * as userData from '@support/interfaces/user_data';
import * as apiCallNewman from '@support/newman/apiCallNewman';
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

// Coverage gap closed by this test (see PI-T2183 coverage analysis for
// INCIDENCIA-2935 — [AMEX] Missing CAPN information): PI-T2183 only exercises
// the manual Authorize -> Capture Partial V1 flow. The incident itself was
// reported on Purchase Directo orders (automatic_capture) for Latam Airlines
// (8 orders affected in production), which is a materially different code
// path in the settlement service. This test proves the AMEX CAPN
// (conciliation_id) is present on a straight-through (auto-captured)
// purchase, not only on a manually authorized one.
const configMerchant = new ConfigMerchant();

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
    // Create Merchant Payment Processor (automatic_capture: true — Purchase Directo)
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.elavonProcessorSettlement,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PI-T2198 (1.0) Purchase Directo V2 → Refund Partial V2 AMEX ELAVON (before settlement)',
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

      await test.step('Purchase Directo V2 with AMEX card', async () => {
        const body_purchase_v2 = CreateBody(creditCardData.amexSuccessful);

        // Do the Purchase
        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, body_purchase_v2 as any)
        ).data as any;
        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order).toBeDefined();
        expect(purchase_v2.order.currency).toEqual('USD');
        expect(purchase_v2.order.payment).toBeDefined();
        expect(purchase_v2.order.payment.data.status).toEqual(StatusInvoice.Processing);

        // Regression guard: the card brand must be correctly detected as AMEX,
        // otherwise the CAPN/conciliation_id logic for AMEX never triggers.
        expect(purchase_v2.order.payment.data.from_card.card_brand).toEqual('amex');

        orderToken = purchase_v2.order_token;
        orderId = purchase_v2.order.order_id;

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
        // Regression guard for INCIDENCIA-2935: AMEX CAPN (15-digit Transaction
        // Identifier) must be present on the purchase directo transaction.
        expect(transaction.conciliation_id).not.toBeFalsy();
        expect(transaction.conciliation_id.length).toEqual(15);

        // Validate Settlement
        const settlement = await validateSettlement(
          purchase_v2.order_token,
          0,
          StatusTransaction.Processing,
          StatusSettlement.Unsettled
        );
        expect(settlement.conciliation_id).toEqual(transaction.conciliation_id);
        expect(settlement.amount).toEqual(purchaseAmount);
        expect(settlement.raw_airline_data).not.toBeFalsy();
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
        expect(settlement.raw_airline_data).not.toBeFalsy();
      });
    }
  );
});
