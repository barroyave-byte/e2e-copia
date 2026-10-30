import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as crypto from 'crypto';
import { CheckoutModule } from '@support/interfaces/checkoutModuleType';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';

const configMerchant = new ConfigMerchant();
let capturedOrderToken: string;

const strFirstName = ' Luis ';
const strLastName = ' Perea ';
const orderId = crypto.randomUUID();
const checkout_modules: CheckoutModule[] = [
  {
    name: 'PriceBreakdownPattern',
    props: {
      show_in_main_view: true,
    },
  },
];
const widgetGeneralsConfig = {
  checkout_modules,
};
const discounts = [
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
  {
    amount: 100,
    code: 'DEUNA2025',
    reference: 'DEUNA2025',
    description: '',
    details_url: 'https://boltswagstore.com/discounts/#12345',
    free_shipping: {
      is_free_shipping: false,
      maximum_cost_allowed: 100,
    },
    discount_category: 'coupon',
  },
];
const payloadOrder = {
  order: {
    order_id: orderId,
    currency: 'MXN',
    timezone: 'America/Mexico_City',
    total_tax_amount: 20000,
    shipping_amount: 110000,
    items_total_amount: 170000,
    sub_total: 280000,
    processor_name: 'all',
    total_amount: 300000,
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
    total_discount: 600,
    display_total_discount: 'MXN 6.00',
    items: [
      {
        id: '79',
        name: '10 ALITAS VOLANTE',
        description: '10 alitas picantes',
        options: 'string option',
        total_amount: {
          amount: 170000,
          currency: 'MXN',
          currency_symbol: '$',
          original_amount: 170000,
        },
        unit_price: {
          amount: 170000,
          currency: 'MXN',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 0,
          currency: 'MXN',
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
    discounts,
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
          phone: '',
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
      id: 0,
      user_id: '',
      first_name: strFirstName,
      last_name: strLastName,
      phone: '',
      identity_document: '050105010501',
      lat: -0.100032,
      lng: -78.46956,
      address1: 'test address',
      address2: '',
      city: 'Ciudad de mexico',
      zipcode: '170515',
      state_name: 'Ciudad de mexico',
      country_code: 'MX',
      additional_description: '',
      address_type: '',
      is_default: false,
      created_at: '0001-01-01T00:00:00Z',
      updated_at: '0001-01-01T00:00:00Z',
    },
    billing_address: {
      identification: '050623568956124',
      id: 0,
      user_id: '',
      first_name: strFirstName,
      last_name: strLastName,
      phone: '',
      identity_document: '1150218418',
      lat: -0.100032,
      lng: -78.46956,
      address1: 'Av. Eloy Alfaro 20, Quito 170515, Ecuador BILLING Purchase',
      address2: 'Av. Eloy Alfaro 20, Quito 170515, Ecuador',
      city: 'Quito',
      zipcode: '170515',
      state_name: 'CRT',
      country: 'MX',
      country_code: 'MX',
      additional_description: 'Descripción adicional',
      address_type: 'home',
      is_default: false,
      created_at: '2021-11-03T22:09:09.086990957Z',
      updated_at: '2021-11-03T22:09:09.087014623Z',
      email: EmailGenerator.generatePayerEmail(),
    },
  },
};
const valueAmount = 400000;
const payloadModifyOrder = {
  order: {
    total_amount: valueAmount,
    items_total_amount: valueAmount,
  },
};

test.describe(
  '@regression PaymentWidget: RefetchOrder return correct information first time',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
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

      const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
        privateKey,
        payloadOrder as any
      );
      capturedOrderToken = tokenizeResponse.data.token;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripeProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig },
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2283 RefetchOrder return correct information first time',
      { tag: ['@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page, emaService }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('The user open the widget and navigate to the payment page', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: capturedOrderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
          await paymentDeunaNowPage.assertEventWasFired(CheckoutEventsName.checkoutStarted);
        });

        await test.step('The order is updated with the new amount and is validated', async () => {
          await emaService.updateOrder(privateKey, capturedOrderToken, payloadModifyOrder);

          await page.evaluate(async (amount) => {
            console.log('window.DeunaSDK', (window as any).DeunaSDK);
            const result = await (window as any).DeunaSDK?.refetchOrder();
            return result.total_amount === amount && result.items_total_amount === amount;
          }, valueAmount);
        });
      }
    );
  }
);
