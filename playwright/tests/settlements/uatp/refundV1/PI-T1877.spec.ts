import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import * as userData from '@support/interfaces/user_data';
import * as validationUser from '@support/interfaces/user_data';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as refundData from '@support/interfaces/refund';
import {
  StatusTransaction,
  TypeTransaction,
  validateTransaction,
} from '../../../order_validate/validate_transactions';
import { StatusInvoice, validateInvoice } from '../../../order_validate/validate_invoice';
import { StatusSettlement, validateSettlement } from '../../../order_validate/validate_settlements';
import { CreateBody } from '../uatp_body';
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
      processorsConfig.uatpProcessorSettlement,
      merchantId,
      merchantToken
    );
  });

  test.fixme(
    '@PI-T1877 (1.0) Purchase → Refund Total V1 UATP',
    {
      tag: ['@settlement', '@team_payment_integration'],
      annotation: { type: 'bug', description: 'PI-4002' },
    },
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
        const invoice = await validateInvoice(
          purchase_v2.order_token,
          body_purchase_v2.order.order_id,
          StatusInvoice.Processing
        );
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

      await test.step('Refund Total', async () => {
        // Refund Total
        await apiCallNewman.refundOrderV2(refundData.successRefund, privateKey, 0, false, {
          orderToken,
        });

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Refunded);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          1,
          TypeTransaction.Refund,
          StatusTransaction.Refunded
        );
        expect(transaction.amount).toEqual(13000);

        // Validate Settlement
        const settlement = await validateSettlement(
          invoice.order_token,
          0,
          StatusTransaction.Processing,
          StatusSettlement.Unsettleable
        );
        expect(settlement.conciliation_id).toEqual(transaction.allTransactions[0].conciliation_id);
        expect(settlement.amount).toEqual(13000);
        expect(settlement.raw_data).not.toBeFalsy();
        expect(settlement.raw_airline_data).not.toBeFalsy();
      });
    }
  );
});
