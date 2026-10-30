import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import * as userData from '@support/interfaces/user_data';
import * as validationUser from '@support/interfaces/user_data';
import * as creditCardData from '@support/interfaces/credit_cards';
import {
  StatusTransaction,
  TypeTransaction,
  validateTransaction,
} from '../../../order_validate/validate_transactions';
import { StatusInvoice, validateInvoice } from '../../../order_validate/validate_invoice';
import { validateSizeSettlements } from '../../../order_validate/validate_settlements';
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

  test(
    '@PI-T1935 (1.0) Purchase Failed UATP',
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
        const body_purchase_v2 = CreateBody(creditCardData.uatpFailedByBank);
        orderId = body_purchase_v2.order.order_id;

        // Validate Response
        const purchase_v2 = (
          await paymentService.purchaseV2(privateKey, userAuthToken, body_purchase_v2 as any, true)
        ).data as any;
        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.data).toBeNull();
        expect(purchase_v2.error).toBeDefined();
        expect(purchase_v2.error.code).toEqual('DP-7100');
        expect(purchase_v2.error.description).toEqual(
          'Payment was declined. Try another card or contact your bank.'
        );
        expect(purchase_v2.error.processor_error).toBeDefined();
        expect(purchase_v2.error.processor_error.code).toEqual('ER02');
        expect(purchase_v2.error.processor_error.message).toEqual('Invalid Card Number');
        orderToken = '';

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Denied);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          0,
          TypeTransaction.Purchase,
          StatusTransaction.Denied
        );
        expect(transaction.amount).toEqual(invoice.amount);
        expect(transaction.conciliation_id.length).toEqual(14);

        // Validate Settlement
        validateSizeSettlements(invoice.order_token, 0);
      });
    }
  );
});
