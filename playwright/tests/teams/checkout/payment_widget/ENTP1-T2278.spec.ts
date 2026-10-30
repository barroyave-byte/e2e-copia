import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { randomUUID } from 'crypto';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { VoucherProcessors, VoucherProcessorsPage } from '@pages/voucher/voucherProcessors';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { assertWidgetPaymentMethodsLoaded } from '@support/helpers/widgetHealthCheck';
import { MERCHANT_LOGO_WIDGETS_CONFIG } from '@support/http/testData/checkout_configuration/MerchantLogoConfig';

const configMerchant = new ConfigMerchant();

const processors = [
  VoucherProcessors.bazReference,
  VoucherProcessors.oxxoReference,
  VoucherProcessors.safetyPayExpress,
];
const orderID = randomUUID();
const payload = {
  order: {
    order_id: `${orderID.toString()}`,
    currency: 'USD',
    timezone: 'America/Guayaquil',
    tax_amount: 3000,
    shipping_amount: 3000,
    items_total_amount: 3000,
    sub_total: 3000,
    processor_name: 'volaris_reference',
    total_amount: 3000,
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
          currency: 'USD',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 850,
          currency: 'USD',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 100,
          currency: 'USD',
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
    billing_address: {
      first_name: 'Cristhian',
      last_name: 'Laurente',
      email: 'claurente@deuna.com',
      identification: '142012251',
      address1: 'Call3 45 #2/3',
      zipcode: '752222',
      city: 'quito',
      state_name: 'valle',
      country: 'EC',
      phone: '+578315263363',
      identification_type: 'RUT',
    },
    shipping_address: {
      first_name: 'Cristhian',
      last_name: 'Laurente',
      email: 'claurente@deuna.com',
      identification: '142012251',
      address1: 'Call3 45 #2/3',
      zipcode: '752222',
      city: 'quito',
      state_name: 'valle',
      country: 'EC',
      phone: '+578315263363',
      identification_type: 'RUT',
    },
    user_instructions: 'This item is a gift.',
    metadata: {
      key1: 'value1',
      key2: 'value2',
    },
    payment_method: 'reference',
    include_payment_options: [
      {
        payment_method: 'reference',
        processors,
      },
    ],
  },
};

test.describe(
  '@regression PaymentWidget: Reference processors (baz, oxxo & safetypay_express) are displayed correctly after initiating a payment with volaris_reference',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('EC');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.createVolarisReference(),
        merchantId,
        merchantToken
      );

      const tokenized = await emaService.tokenizeOrderWithCustomBody(
        privateKey,
        payload as unknown as TokenizeOrderRequestData
      );
      orderToken = tokenized.data.token;

      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig: MERCHANT_LOGO_WIDGETS_CONFIG },
        merchantId,
        merchantToken
      );
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

    test(
      '@ENTP1-T2278 PaymentWidget: Reference processors (baz, oxxo & safetypay_express) are displayed correctly after initiating a payment with volaris_reference',
      { tag: ['@payment_widget', '@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const voucherProcessorsPage = new VoucherProcessorsPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        await test.step('Validate widget loaded payment methods', async () => {
          await assertWidgetPaymentMethodsLoaded(page);
        });

        await test.step('The user selects the reference country', async () => {
          await paymentDeunaNowPage.selectReferenceCountry();
        });

        await test.step('The user clicks the Pay button', async () => {
          await paymentDeunaNowPage.clickPay();
        });

        await test.step('The order status is "processing"', async () => {
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processing', 200);
        });

        await test.step('The available reference processors are displayed', async () => {
          await voucherProcessorsPage.assertTitleProcessors(processors);
        });

        await test.step('SafetyPay Express accordion is expanded by default (if present)', async () => {
          await voucherProcessorsPage.assertProcessorAccordionOpen(
            VoucherProcessors.safetyPayExpress
          );
        });

        await test.step('The user opens the BAZ reference accordion and verifies content', async () => {
          await voucherProcessorsPage.openProcessorAccordion(VoucherProcessors.bazReference);
          await voucherProcessorsPage.assertProcessorContentVisible(VoucherProcessors.bazReference);
        });

        await test.step('The user opens the OXXO reference accordion and verifies content', async () => {
          await voucherProcessorsPage.openProcessorAccordion(VoucherProcessors.oxxoReference);
          await voucherProcessorsPage.assertProcessorContentVisible(
            VoucherProcessors.oxxoReference
          );
        });

        await test.step('The user verifies the payment status is "processing" in the admin panel', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processing');
        });
      }
    );
  }
);
