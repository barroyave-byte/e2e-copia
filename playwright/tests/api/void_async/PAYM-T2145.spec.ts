import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { faker } from '@faker-js/faker';

const configMerchant = new ConfigMerchant();

const kushkiManualCapture = { ...processorsConfig.kushkiProcessor, automatic_capture: false };

const kushkiCard = creditCardData.kushkiVisaSuccessfull;

const creditCard = {
  card_holder_dni: '12345678',
  expiry_month: kushkiCard.expiration_date.substring(0, 2),
  expiry_year: `20${kushkiCard.expiration_date.substring(2, 4)}`,
  card_holder: 'APRO',
  card_number: kushkiCard.number,
  card_cvv: kushkiCard.cvv_code,
  address1: 'Santo Domingo 1',
  address2: '',
  zip: '1215',
  city: 'Santo Domingo',
  state: 'Distrito Nacional',
  country: 'CL',
  phone: '12345755',
};

test.describe('@regression validates the void async endpoint', () => {
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
    await apiCallNewman.createPaymentProcessor(kushkiManualCapture, merchantId, merchantToken);

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
    '@PAYM-T2145 Validates a succes void async request',
    { tag: ['@team_payment_integration'] },
    async ({ page, paymentService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      await test.step('Perform void async and validate async task fields', async () => {
        const voidResult = await paymentService.voidAsync(
          orderData.token,
          privateKey,
          100,
          'void async test'
        );
        await paymentDeunaNowPage.assertExpectedAsyncTaskFields(
          orderData,
          (voidResult.data as any).data,
          'void'
        );
      });
    }
  );
});
