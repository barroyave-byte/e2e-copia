import { withUniqueOrderAmount } from '@support/utils/uniqueOrderAmount';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { test } from '@support/fixtures';
import * as crypto from 'crypto';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';

const configMerchant = new ConfigMerchant();

const payloadOrder = {
  order: {
    order_id: crypto.randomUUID(),
    store_code: 'all',
    currency: 'MXN',
    items_total_amount: 2175,
    tax_amount: 0,
    sub_total: 2175,
    shipping_amount: 100,
    payment_method: 'credit_card',
    shipping_tax_amount: 0,
    total_tax_amount: 65,
    total_amount: 2240,
    shipping_methods: [
      {
        code: '12345JR',
        name: 'entregas Speed',
        cost: 250,
      },
    ],
    discounts: [],
    items: [
      {
        id: crypto.randomUUID(),
        name: 'Papas',
        description: 'Papas fritas con paprica',
        total_amount: {
          original_amount: 2100,
          amount: 2050,
          total_discount: 100,
          currency: 'MXN',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 1050,
          currency: 'MXN',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 50,
          currency: 'MXN',
          currency_symbol: '$',
        },
        quantity: 2,
        image_url:
          'https://media-cdn.tripadvisor.com/media/photo-s/1a/e2/c6/68/porcion-de-papas-a-la.jpg',
        taxable: true,
      },
      {
        id: crypto.randomUUID(),
        name: 'Refresco',
        description: 'Coca-cola Sprite',
        total_amount: {
          original_amount: 75,
          amount: 90,
          total_discount: 0,
          currency: 'MXN',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 75,
          currency: 'MXN',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 15,
          currency: 'MXN',
          currency_symbol: '$',
        },
        quantity: 1,
        image_url:
          'https://media-cdn.tripadvisor.com/media/photo-s/1a/e2/c6/68/porcion-de-papas-a-la.jpg',
        taxable: true,
      },
    ],
    shipping_address: {
      id: 111,
      first_name: 'Pablo',
      last_name: 'Murillo',
      email: 'shipping@deuna.com',
      address1: 'Avenida Paseo de la Reforma',
      address2: 'Colonia Juárez',
      zipcode: '06600',
      city: 'Ciudad de México',
      state_name: 'Ciudad de México',
      country_code: 'MEX',
      identity_document: '74857601',
      identity_document_type: 'DNI',
      phone: '+5521987654321',
      lat: -22.943934,
      lng: -43.182984,
      additional_description: 'Descripción adicional',
      address_type: 'home',
    },
    billing_address: {
      id: 222,
      first_name: 'Jean',
      last_name: 'Roldan',
      email: 'billing@deuna.com',
      address1: 'Calle Independencia',
      address2: 'Centro Histórico',
      zipcode: '44100',
      city: 'Guadalajara',
      state_name: 'Jalisco',
      country_code: 'MEX',
      identity_document: '74857601',
      identity_document_type: 'DNI',
      phone: '+5521987654321',
      lat: -23.555425,
      lng: -46.677048,
      address_type: 'home',
    },
    user_instructions: 'User instructions',
    metadata: {
      origin: 'core',
    },
    browser_details: {
      screen_height: 1000,
      screen_width: 2000,
    },
    webhook_urls: {
      notify_order: '',
      apply_coupon: '',
      remove_coupon: '',
      get_shipping_methods: '',
      update_shipping_method: '',
      'Tarifa de envio': '',
    },
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.fiservProcessor3DSMX,
      merchantId,
      merchantToken
    );
    const tokenized = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      withUniqueOrderAmount(payloadOrder) as any
    );
    orderToken = tokenized.data.token;
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test.fixme(
    '@PI-T1812 (1.0) 3DS Challenge con IFRAME Fallido con Fiserv usando el widget para MX',
    {
      tag: ['@payments_integration', '@team_payment_integration'],
      annotation: { type: 'bug', description: 'PI-3886' },
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('Selecting user guest', async () => {
        await paymentDeunaNowPage.userGuest();
      });

      await test.step('User enters credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.fiserv3DSChallengueWithIframe,
          { country: 'MX' }
        );
      });

      await test.step('User select Pay', async () => {
        paymentDeunaNowPage.threeDSUrlAwaiter();
        await paymentDeunaNowPage.clickPay();
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('pending_3ds', 200);
        const page3DS = page.waitForEvent('popup', { timeout: 30000 });
        await paymentDeunaNowPage.assert3dsResponseSuccess();
        const challenge3ds = new Challenge3dsPage(await page3DS);
        await challenge3ds.selectFailedChallengeFiserv();
      });

      await test.step('Validates that the order has been placed correctly with the status of both the payment and the order', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('denied');
      });
    }
  );
});
