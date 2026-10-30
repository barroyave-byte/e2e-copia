import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { faker } from '@faker-js/faker';
import { kushkiVisaSuccessfull } from '@support/interfaces/credit_cards';

const configMerchant = new ConfigMerchant();

const kushkiAutoCapture = { ...processorsConfig.kushkiProcessor, automatic_capture: true };

const creditCard = {
  card_holder_dni: '12345678',
  expiry_month: '11',
  expiry_year: '2027',
  card_holder: 'APRO',
  card_number: kushkiVisaSuccessfull.number,
  card_cvv: kushkiVisaSuccessfull.cvv_code,
  address1: 'Santo Domingo 1',
  address2: '',
  zip: '1215',
  city: 'Santo Domingo',
  state: 'Distrito Nacional',
  country: 'CL',
  phone: '12345755',
};

test.describe('@regression validates the refund async endpoint', () => {
  let orderData: { token: string; order: { order_id: string }; merchant_id: string };
  let userToken: string;
  let privateKey: string;

  test.beforeAll(async ({ emaService, paymentService }) => {
    const {
      merchantId,
      privateKey: merchantPrivateKey,
      merchantToken,
    } = await configMerchant.basicSetup('MX');
    privateKey = merchantPrivateKey;
    await apiCallNewman.createPaymentProcessor(kushkiAutoCapture, merchantId, merchantToken);

    const tokenizeResult = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderData = {
      token: tokenizeResult.data.token,
      order: tokenizeResult.data.order,
      merchant_id: merchantId,
    };

    userToken = await apiCallNewman.loginGuest(merchantId, faker.string.uuid(), privateKey);
    await paymentService.purchase(privateKey, userToken, {
      token: orderData.token,
      email: 'test.refund.async@deuna.com',
      processor_name: 'kushki',
      method_type: 'credit_card',
      store_code: 'all',
      credit_card: creditCard,
    } as any);
  });

  test(
    '@PAYM-T2144 Validates a success refund async request',
    { tag: ['@fraud', '@admin-preprod', '@team_admin'] },
    async ({ page, paymentService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      await test.step('Perform refund async and validate async task fields', async () => {
        const refundResult = await paymentService.refundAsync(
          orderData.token,
          privateKey,
          100,
          'refund async test'
        );
        await paymentDeunaNowPage.assertExpectedAsyncTaskFields(
          orderData,
          (refundResult.data as any).data,
          'refund'
        );
      });
    }
  );
});
