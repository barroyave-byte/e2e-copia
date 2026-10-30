import { EmailGenerator } from '@support/utils/EmailGenerator';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import * as crypto from 'crypto';

const configMerchant = new ConfigMerchant();

const body_sent = {
  token: '',
  method_type: 'voucher',
  processor_name: 'payu_oxxo_cash',
  amount: 5000,
  email: 'avaldivia@deuna.com',
  full_name: 'John Smith',
  specific_fields: {
    description: 'Order description Oxxo cash e2e test',
  },
  credit_card: {
    card_holder: 'John Smith',
    phone: '+593978834442',
    address1: 'Manta',
  },
  billing_address: {
    first_name: 'John',
    last_name: 'Smith',
    email: 'avaldivia@deuna.com',
    identification: '12334568799',
    address1: 'Calle Cuba El Almirante',
    address2: '33',
    zip: '11809',
    city: 'Santo Domingo',
    state: 'SD',
    country: 'RD',
    phone: '8091234567',
  },
  shipping_address: {
    first_name: 'John',
    last_name: 'Smith',
    email: 'avaldivia@deuna.com',
    identification: '12334568799',
    address1: 'Calle Cuba El Almirante',
    address2: '33',
    zip: '11809',
    city: 'Santo Domingo',
    state: 'SD',
    country: 'RD',
    phone: '8091234567',
  },
};

let externalTransactionId = '';

const body_sent_webhook = {
  response_message_pol: 'APPROVED',
  transaction_id: '',
  payment_method_type: '7',
  date: '2024.08.20 04:44:35',
  pse_reference3: '',
  pse_reference2: '',
  commision_pol: '0.00',
  pse_reference1: '',
  shipping_city: 'Ciudad de México',
  bank_referenced_name: '',
  sign: '7276e932a84321ac719151ff3bcdc76bb5ac55bbd8be97368cf38feb9a75b155',
  extra2: '',
  extra3: '',
  operation_date: '2024-08-20 16:44:35',
  billing_address: "6011 O'Connell Via 361 Hegmann Path",
  payment_request_state: 'A',
  extra1: '',
  administrative_fee: '0.00',
  administrative_fee_tax: '0.00',
  bank_id: '131',
  nickname_buyer: '',
  payment_method: '131',
  attempts: '1',
  transaction_date: '2024-08-20 16:44:35',
  test: '0',
  exchange_rate: '1.00',
  ip: '198.163.243.52',
  reference_pol: '2152574274',
  tax: '125.00',
  antifraudMerchantId: '',
  pse_bank: '',
  transaction_type: 'AUTHORIZATION_AND_CAPTURE',
  state_pol: '4',
  billing_city: 'Ciudad de México',
  phone: '5555555555',
  error_message_bank: '',
  payment_way_id: '1',
  shipping_country: 'MX',
  error_code_bank: '',
  cus: '21e13967-8e21-4779-8fd4-2265d34a384a',
  customer_number: 'Merchant_Buyer_ID_301',
  description: 'PayULatam|Test|MX|MXN|Cash|Oxxo',
  merchant_id: '511620',
  administrative_fee_base: '0.00',
  authorization_code: '',
  currency: 'MXN',
  shipping_address: '35558 Sipes Way',
  installments_number: '',
  nickname_seller: '',
  value: '905.00',
  transaction_bank_id: '',
  billing_country: 'MX',
  response_code_pol: '1',
  payment_method_name: 'Oxxo',
  office_phone: '556540721',
  email_buyer: 'Kaleb_Witting6@example.com',
  payment_method_id: '7',
  account_id: '516561',
  bank_referenced_code: 'CASH',
  airline_code: '',
  pseCycle: '',
  risk: '',
  reference_sale: 'Postman|UniqueReference|8/20/2024, 3:43:41 PM',
  additional_value: '0.00',
};

let merchantProcessorID = '';
let privateKey: string;
let merchantId: string;
let merchantToken: string;
let merchantName: string;
let orderId: string;
let orderToken: string;

test.describe('@regression feature to validate with the automated test case', () => {
  test.beforeAll(async () => {
    const responseMerchant = await configMerchant.basicSetup('MX');
    merchantId = responseMerchant.merchantId;
    merchantToken = responseMerchant.merchantToken;
    merchantName = responseMerchant.merchantName;
    privateKey = responseMerchant.privateKey;
    merchantProcessorID = await apiCallNewman.createPaymentProcessor(
      processorsConfig.payuOxxoCashProcessorPayconnect,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T4 Purchase with Payu Oxxo Cash',
    { tag: ['@payments_integration', '@team_payconnect'] },
    async ({ emaService, paymentService, page }) => {
      await test.step('User tries to make a purchase with oxxo cash', async () => {
        const userAuthToken = await apiCallNewman.loginGuest(
          merchantId,
          crypto.randomUUID(),
          privateKey
        );

        const responseOrderToken = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
          user_email: EmailGenerator.generatePayerEmail(),
        });
        orderId = responseOrderToken.data.order.order_id;

        orderToken = responseOrderToken.data.token;

        expect(orderToken).not.toBeUndefined();

        body_sent.token = orderToken;

        const purchaseResponse = await paymentService.purchase(
          privateKey,
          userAuthToken,
          body_sent as any
        );

        externalTransactionId = (purchaseResponse.data as any).order.payment.data
          .external_transaction_id;
        const transactionID = (purchaseResponse.data as any).order.order_id;
        console.log('-----> Transaction ID: ', transactionID);
        body_sent_webhook.transaction_id = externalTransactionId;
      });

      await test.step('It is validated that the order contains the next_action object', async () => {
        const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        expect(paymentData.orderPayment.data.method_type).toBe('voucher');
        expect(paymentData.orderPayment.data.next_action).not.toBeUndefined();
      });

      await test.step('Payu Oxxo cash notifies when the payment is made by the user', async () => {
        await paymentService.sendPaymentWebhook(
          merchantId,
          merchantProcessorID,
          body_sent_webhook as any
        );
      });

      await test.step('It is validated that the order status is processed', async () => {
        await page.waitForTimeout(5000);
        const paymentData = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        expect(paymentData.orderPayment.data.status).toBe('processed');
      });
    }
  );
});
