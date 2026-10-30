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

let privateKey: string;
let merchantId: string;
let merchantToken: string;
let merchantName: string;
let orderToken: string;
let orderId: string;

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  test.beforeAll(async ({ emaService }) => {
    const responseMerchant = await configMerchant.basicSetup('MX');
    merchantId = responseMerchant.merchantId;
    merchantToken = responseMerchant.merchantToken;
    merchantName = responseMerchant.merchantName;
    privateKey = responseMerchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.payuOxxoCashProcessorPayconnect,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PF-T3 Generate barcode',
    { tag: ['@payments_integration', '@team_payconnect', '@preprod', '@purchase', '@api'] },
    async ({ emaService, paymentService }) => {
      await test.step('User tries to make a purchase with oxxo cash', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);
      });

      const responseOrderToken = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: EmailGenerator.generatePayerEmail(),
      });
      orderId = responseOrderToken.data.order.order_id;
      const orderToken = responseOrderToken.data.token;
      console.log('orderToken', orderToken);
      expect(orderToken).not.toBeUndefined();

      body_sent.token = orderToken;
      await paymentService.purchase(privateKey, userAuthToken, body_sent as any);
    }
  );
});
