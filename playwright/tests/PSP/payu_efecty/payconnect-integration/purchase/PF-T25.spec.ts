import { EmailGenerator } from '@support/utils/EmailGenerator';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import * as crypto from 'crypto';
import DateTime from '@support/utils/datetime';
import { retryGetOrderStatus } from '@support/utils/retries';

const configMerchant = new ConfigMerchant();

const purchasePayloadV2 = {
  order_token: '',
  payer_info: {
    email: 'avaldivia@deuna.com',
    full_name: 'John Smith',
  },
  payment_source: {
    method_type: 'voucher',
    processor: 'payu_efecty',
    card_info: {
      card_holder: 'John Smith',
      phone: '+593978834442',
      address1: 'Manta',
    },
  },
  order: {
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
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderId: string;
  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('CO');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.payuEfectyProcessorPayconnect,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T25 Payu Efecty - Purchase V2 exitoso',
    { tag: ['@payments_integration', '@team_payconnect', '@preprod', '@purchase', '@api'] },
    async ({ emaService, paymentService }) => {
      await test.step('User tries to make a purchase with payu efecty', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);

        const expirationDate = DateTime.now().addMinutes(20).setMilliseconds(0).toJSDate();

        const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('CO', privateKey, {
          expires_at: expirationDate.toJSON(),
          amount: 3000000,
          user_email: EmailGenerator.generatePayerEmail(),
        });
        orderId = tokenizeResponse.data.order.order_id;

        orderToken = tokenizeResponse.data.token;
        expect(orderToken).not.toBeUndefined();

        purchasePayloadV2.order_token = orderToken;

        await paymentService.purchaseV2(privateKey, userAuthToken, purchasePayloadV2 as any);
      });

      await test.step('It is validated that the order contains the next_action object', async () => {
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'pending');
        const getOrderResponse = await emaService.getOrder(privateKey, orderToken);
        const orderPayment = getOrderResponse.data.order.payment;
        expect(orderPayment.data.method_type).toBe('voucher');
        expect(orderPayment.data.next_action).not.toBeUndefined();
        expect(orderPayment.data.next_action.action).not.toBeUndefined();
        expect(orderPayment.data.next_action.action).toBe('authorization_voucher');
        expect(orderPayment.data.next_action.authorization_voucher).not.toBeUndefined();
        expect(orderPayment.data.next_action.authorization_voucher.bar_code).not.toBeUndefined();
        expect(
          orderPayment.data.next_action.authorization_voucher.expiration_date
        ).not.toBeUndefined();
        expect(
          orderPayment.data.next_action.authorization_voucher.url_payment_receipt_html
        ).not.toBeUndefined();
        expect(
          orderPayment.data.next_action.authorization_voucher.url_payment_receipt_pdf
        ).not.toBeUndefined();
      });
    }
  );
});
