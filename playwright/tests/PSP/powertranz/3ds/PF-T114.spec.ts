import { EmailGenerator } from '@support/utils/EmailGenerator';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const globalAssert = new GlobalAssert();

//Time required due to new implementation for automatic call of continue 3ds
const page3dsTimeOut = 40000;

const email = EmailGenerator.generatePayerEmail();
const body_sent = {
  order: {
    order_id: `${crypto.randomUUID()}`,
    currency: 'HNL',
    timezone: 'America/Mexico_City',
    tax_amount: 5000,
    shipping_amount: 5000,
    items_total_amount: 5000,
    sub_total: 5000,
    total_amount: 5000,
    store_code: 'all',
    webhook_urls: {
      notify_order: 'https://staging-kfc-ec.deuna.io/api/v1/orders/notify',
      apply_coupon: 'https://staging-kfc-ec.deuna.io/api/v1/orders/{order_token}/coupons',
      remove_coupon:
        'https://staging-kfc-ec.deuna.io/api/v1/orders/{order_token}/coupons/{coupon_code}',
      get_shipping_methods: '',
      update_shipping_method: '',
      shipping_rate: 'https://staging-kfc-ec.deuna.io/api/v1/orders/{order_token}/shipping',
    },
    items: [
      {
        id: '79',
        name: '10 ALITAS VOLANTE',
        description: '10 alitas picantes',
        options: 'string option',
        total_amount: {
          amount: 1200,
          currency: 'HNL',
          currency_symbol: '$',
          original_amount: 1200,
        },
        unit_price: {
          amount: 850,
          currency: 'HNL',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 100,
          currency: 'HNL',
          currency_symbol: '$',
        },
        quantity: 1,
        uom: 'string',
        upc: 'string',
        sku: 'SKU-11021',
        isbn: '12-345-678-90123',
        brand: 'Bolt Swagstore',
        manufacturer: 'Bolt Factory',
        category: 'hats',
        color: 'Red',
        size: 'XXL',
        weight: {
          weight: 22,
          unit: 'kg',
        },
        image_url: 'https://boltswagstore.com/inventory/hats/red-hat.png',
        details_url: 'https://boltswagstore.com/inventory/hats/red-hat.png',
        type: 'physical',
        taxable: true,
      },
    ],
    discounts: [
      {
        amount: 500,
        code: 'SUMMERFUN15',
        reference: 'SUMMERFUN15',
        description: '',
        details_url: 'https://boltswagstore.com/discounts/#12345',
        free_shipping: {
          is_free_shipping: false,
          maximum_cost_allowed: 100,
        },
        discount_category: 'coupon',
      },
    ],
    shipping_options: {
      type: 'pickup',
      details: {
        store_name: 'Store Name',
        address: '6 Rotermanni 11343 Talinn',
        address_coordinates: {
          lat: 4.721245,
          lng: -74.04673,
        },
        contact: {
          name: 'jhon snow',
          phone: '972514910',
        },
        additional_details: {
          pickup_time: '2021-11-03T22:09:09.086990957Z',
          stock_location: '',
        },
      },
    },
    user_instructions: 'This item is a gift.',
    metadata: {
      key1: 'value1',
      key2: 'value2',
    },
    shipping_address: {
      identification: '050623568956124',
      id: 0,
      user_id: '',
      first_name: 'NELSON',
      last_name: 'JIMENEZ',
      phone: '593986100449',
      identity_document: '1150218418',
      lat: -0.100032,
      lng: -78.46956,
      address1: 'Av. Eloy Alfaro 20, Quito 170515, Ecuador BILLING Purchase',
      address2: 'Av. Eloy Alfaro 20, Quito 170515, Ecuador',
      city: 'CDMX',
      zipcode: '170515',
      state_name: 'CMX',
      country: 'HN',
      additional_description: 'Descripción adicional',
      address_type: 'home',
      is_default: false,
      created_at: '2021-11-03T22:09:09.086990957Z',
      updated_at: '2021-11-03T22:09:09.087014623Z',
      country_code: 'HN',
      email,
    },
    billing_address: {
      identification: '050623568956124',
      id: 0,
      user_id: '',
      first_name: 'NELSON',
      last_name: 'JIMENEZ',
      phone: '59 3986100449',
      identity_document: '1150218418',
      lat: -0.100032,
      lng: -78.46956,
      address1: 'Av. Eloy Alfaro 20, Quito 170515, Ecuador BILLING Purchase',
      address2: 'Av. Eloy Alfaro 20, Quito 170515, Ecuador',
      city: 'CMX',
      zipcode: '17051',
      state_name: 'CRT',
      country: 'HN',
      additional_description: 'Descripción adicional',
      address_type: 'home',
      is_default: false,
      created_at: '2021-11-03T22:09:09.086990957Z',
      updated_at: '2021-11-03T22:09:09.087014623Z',
      email,
      country_code: 'HN',
    },
  },
  checkout_modules: [],
};

test.describe('@regression Purchase 3ds exitoso con Powertranz Challenge con Usuario Invitado usando payment widget HN', () => {
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('POWERTRANZ_PROCESSOR3DS_HN');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    // tokenize order type deunanow (payment widget)
    const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, body_sent as any);
    orderToken = tokenized.data.token;
    // create payment processor
  });

  test.beforeEach(
    'The user opens the testing page and opens the required widget',
    async ({ page }) => {
      // Open the testing page and navigate to the widget to be tested
      const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    }
  );

  test(
    '@PF-T114 Purchase 3ds exitoso con Powertranz Challenge con Usuario Invitado usando payment widget HN',
    { tag: ['@team_payconnect', '@preprod', '@purchase'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('User enters credit card information', async () => {
        // Fill credit card data in payment widget
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.powertranzVisa3dsChallengeSuccessful,
          { country: 'HN' }
        );
      });

      await test.step('User select Pay', async () => {
        const pageChallenge3DS = page.waitForEvent('popup', { timeout: page3dsTimeOut });
        // Click pay button
        await paymentDeunaNowPage.clickPay();

        const challenge3ds = new Challenge3dsPage(await pageChallenge3DS);
        await challenge3ds.selectSuccessChallengePowertranz();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        const status = 'processed';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
