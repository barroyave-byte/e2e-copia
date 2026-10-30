import { EmailGenerator } from '@support/utils/EmailGenerator';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { expect, test } from '@support/fixtures';
import * as crypto from 'crypto';
import { MethodType, PurchaseRequestV2 } from '@support/http/models/payment';
import * as creditCardData from '@support/interfaces/credit_cards';

const purchaseRequest: PurchaseRequestV2 = {
  order_token: '',
  payer_info: { email: 'avaldivia@deuna.com' },
  payment_source: {
    method_type: MethodType.CREDIT_CARD,
    processor: 'kushki',
    card_info: {
      card_holder_dni: '3782822',
      expiry_month: '06',
      expiry_year: '2030',
      card_holder: 'Prueba por Deuna',
      card_number: creditCardData.kushkiVisaSuccessfull.number,
      card_cvv: '123',
      address1: 'Santo Domingo 1',
      zip: '1215',
      city: 'Santo Domingo',
      state: 'Distrito Nacional',
      country: 'CO',
      phone: '+559553085383',
    },
  },
  anti_fraud_info: {
    user_agent: 'postman',
    browser_details: {
      screen_height: 100,
      screen_width: 200,
      accept_header: '*/*',
      color_depth: 57,
      java_enabled: true,
      java_script_enabled: true,
      language: 'en-US',
      time_zone_offset: 500,
    },
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
  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchantConfig = await merchantPool.acquire('KUSHKI_PROCESSOR_MX');
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    merchantName = merchantConfig.merchantName;
    privateKey = merchantConfig.privateKey;
  });

  test(
    '@PF-T1 Purchase V2 EMA',
    { tag: ['@payments_integration', '@demo', '@preprod', '@purchase', '@team_payconnect'] },
    async ({ emaService, paymentService }) => {
      await test.step('User tries to make a purchase using new browser detail fields', async () => {
        userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);
      });

      const responseOrderToken = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: EmailGenerator.generatePayerEmail(),
      });
      orderToken = responseOrderToken?.data?.token;
      orderId = responseOrderToken?.data?.order?.order_id;

      expect(orderToken).not.toBeUndefined();

      purchaseRequest.order_token = orderToken;
      await paymentService.purchaseV2(privateKey, userAuthToken, purchaseRequest);
    }
  );
});
