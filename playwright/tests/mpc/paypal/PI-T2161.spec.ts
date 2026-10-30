import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import * as userData from '@support/interfaces/user_data';
import * as validationUser from '@support/interfaces/user_data';
import * as validationCapture from '@support/interfaces/capture';
import { StatusInvoice, validateInvoice } from '../../order_validate/validate_invoice';
import {
  StatusTransaction,
  validateTransaction,
  TypeTransaction,
} from '../../order_validate/validate_transactions';

import { validateCaptureV2 } from '@tests/order_validate/validate_capture_v2';
import {
  OrderBuilder,
  OrderConfig,
  OrderCurrency,
  OrderType,
  PurchaseRequestBuilderV2,
} from '@tests/order_builder/order_builder';
import { PayPalPage } from '@pages/wallet/paypalPage';
import { OrderRequestPaypal } from './order';
import { TokenizeOrderResponse } from '@support/http/models/order';
import { MethodType, PurchaseResponse } from '@support/http/models/payment';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

export const paypalAccount = {
  email: 'sb-4qaj039273548@personal.example.com',
  password: 'DunaPayPal@25',
};

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  let processorId: string = '';
  let paypalPage: PayPalPage;
  let paypalURL: string = '';

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
    processorId = await apiCallNewman.createPaymentProcessor(
      processorsConfig.paypalWalletProcessorMPC,
      merchantId,
      merchantToken
    );
  });

  test.fixme(
    '@PI-T2161 (1.0) MPC Offline final for flag Paypal',
    { annotation: { type: 'bug', description: 'PF-3806' }, tag: '@mpc' }, // TODO: Jean Roldan required solver problem with rabbitMQ
    async ({ page }) => {
      let orderToken: string;
      let orderId: string;
      const email = EmailGenerator.generateRegisteredUserEmail();

      await test.step('Tokenize Order', async () => {
        const body = OrderRequestPaypal(email);
        const validate = (result: TokenizeOrderResponse, statusCode: number) => {
          expect(statusCode).toBe(200);
          expect(result.error).toBeFalsy();
        };
        const orderTokenized = await apiCallNewman.CreateOrder(privateKey, body, validate);
        expect(orderTokenized.token).toBeDefined();
        expect(orderTokenized.token).not.toBeFalsy();
        expect(orderTokenized.order).toBeDefined();
        expect(orderTokenized.order.order_id).toBeDefined();
        expect(orderTokenized.order.order_id).not.toBeFalsy();
        orderToken = orderTokenized.token;
        orderId = orderTokenized.order.order_id;
      });

      await test.step('Register User', async () => {
        const registerUser = await apiCallNewman.registerUser(
          email,
          userData.userDataUS,
          validationUser.successUser,
          privateKey,
          merchantId
        );
        expect(registerUser.token).toBeDefined();
        userAuthToken = registerUser.token;
      });

      await test.step('Authorize', async () => {
        const configOrder: OrderConfig = {
          email: email,
          order_type: OrderType.DEUNA_CHECKOUT,
          order_currency: OrderCurrency.USD,
          method_type: MethodType.WALLET,
          order_token: orderToken,
        };

        const validate = (result: PurchaseResponse, statusCode: number) => {
          expect(statusCode).toBe(200);
          expect(result.error).toBeFalsy();
        };

        const body_purchase_v2 = PurchaseRequestBuilderV2(configOrder);
        const purchase_v2 = await apiCallNewman.PurchaseV2(
          userAuthToken,
          privateKey,
          body_purchase_v2,
          validate
        );
        expect(purchase_v2).toBeDefined();
        expect(purchase_v2.order).toBeDefined();
        expect(purchase_v2.order.currency).toEqual(OrderCurrency.MXN);
        expect(purchase_v2.order.status).toEqual('pending');
        expect(purchase_v2.order.payment).toBeDefined();
        expect(purchase_v2.order.payment.data.status).toEqual(StatusInvoice.Pending);
        expect(purchase_v2.order.payment.data.next_action).toBeDefined();
        const next_action = purchase_v2.order.payment.data.next_action;
        expect(next_action.action).toBeDefined();
        expect(next_action.action).toEqual('authorization_wallet');
        expect(next_action.authorization_wallet).toBeDefined();
        expect(next_action.authorization_wallet.redirect_url).toBeDefined();
        expect(next_action.authorization_wallet.redirect_url).not.toBeFalsy();
        paypalURL = next_action.authorization_wallet.redirect_url;

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Pending, false);
        expect(invoice.refund_cutoff_at).toBeFalsy();
        expect(invoice.capture_cutoff_at).toBeFalsy();
        expect(invoice.verify_at).toBeFalsy();
        expect(invoice.amount).toEqual(13000);

        // Validate Transaction
        const transaction = await validateTransaction(
          invoice.id,
          0,
          TypeTransaction.Authorize,
          StatusTransaction.Authorizing
        );
        expect(transaction.amount).toEqual(invoice.amount);
        expect(transaction.is_final_operation).toEqual(false);
      });

      await test.step('Paypal Challenge', async () => {
        await page.context().clearCookies();
        await page.context().clearPermissions();
        await page.goto(paypalURL);

        paypalPage = new PayPalPage(page);
        await paypalPage.loginCheckout(paypalAccount.email, paypalAccount.password);
        await paypalPage.clickOnPaymentButton();
        await paypalPage.closePage();
      });

      await test.step('Paypal Force Update Cron', async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await apiCallNewman.paymentCron();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await apiCallNewman.paymentCron();
      });

      await test.step('Validate Authorize', async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        // Vlidate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Authorized, false);
        expect(invoice.refund_cutoff_at).toBeFalsy();
        expect(invoice.capture_cutoff_at).toBeFalsy();
        expect(invoice.verify_at).toBeFalsy();
        expect(invoice.amount).toEqual(13000);

        // Validate transaction TODO: UPDATE FOR PR
        const transaction = await validateTransaction(
          invoice.id,
          0,
          TypeTransaction.Authorize,
          StatusTransaction.Authorizing // TODO: Cambiar esto dado que es un error del webhhok
        );
        expect(transaction.amount).toEqual(invoice.amount);
        expect(transaction.is_final_operation).toEqual(false);
      });

      await test.step('Capture Partial 1', async () => {
        const resultCaptureV2 = await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          5000,
          undefined,
          { orderToken }
        );

        validateCaptureV2({
          result: resultCaptureV2,
          invoiceStatus: StatusInvoice.PartialCapturing,
          transactionAmount: 5000,
          transactionCurrency: OrderCurrency.MXN,
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
        expect(invoice.refund_cutoff_at).toBeFalsy();
        expect(invoice.verify_at).toBeFalsy();

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
        expect(transaction.is_final_operation).toEqual(false);
      });

      await test.step('Capture Partial 2', async () => {
        const resultCaptureV2 = await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          5000,
          undefined,
          { orderToken }
        );

        validateCaptureV2({
          result: resultCaptureV2,
          invoiceStatus: StatusInvoice.PartialCapturing,
          transactionAmount: 5000,
          transactionCurrency: OrderCurrency.MXN,
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
        expect(invoice.refund_cutoff_at).toBeFalsy();
        expect(invoice.verify_at).toBeFalsy();

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
        expect(transaction.is_final_operation).toEqual(false);
      });

      await test.step('Capture Partial 3 FINAL', async () => {
        const resultCaptureV2 = await apiCallNewman.captureV2(
          validationCapture.captureSuccess,
          privateKey,
          3000,
          undefined,
          { orderToken }
        );

        validateCaptureV2({
          result: resultCaptureV2,
          invoiceStatus: StatusInvoice.Capturing,
          transactionAmount: 3000,
          transactionCurrency: OrderCurrency.MXN,
          transactionStatus: StatusTransaction.Captured,
          indexCapture: 2,
        });

        // Validate Invoice
        const invoice = await validateInvoice(orderToken, orderId, StatusInvoice.Capturing, false);
        expect(invoice.capture_cutoff_at).toBeFalsy();
        expect(invoice.refund_cutoff_at).toBeFalsy();
        expect(invoice.verify_at).toBeFalsy();

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
        expect(transaction.raw_request).toHaveProperty('amount');
        const amount = transaction.raw_request['amount'];
        expect(amount).toHaveProperty('value');
        expect(amount['value']).toEqual('130.00');
        expect(amount).toHaveProperty('currency_code');
        expect(amount['currency_code']).toEqual(OrderCurrency.MXN);
        expect(transaction.is_final_operation).toEqual(true);
      });
    }
  );

  test.afterAll(async ({ paymentService }) => {
    await paymentService.deletePaymentProcessor(processorId, merchantId, merchantToken);
  });
});
