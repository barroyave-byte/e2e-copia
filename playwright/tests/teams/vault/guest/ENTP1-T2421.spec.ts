import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as crypto from 'crypto';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { userEmail } from '@support/interfaces/orders';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';

const configMerchant = new ConfigMerchant();

const payload = {
  order: {
    order_id: crypto.randomUUID(),
    store_code: 'all',
    browser_details: {
      ip_address: '181.14.188.20',
      time_zone_offset: 180,
    },
    currency: 'MXN',
    tax_amount: 0,
    display_tax_amount: '$     19,55',
    shipping_amount: 0,
    display_shipping_amount: 'MXN19,55',
    items_total_amount: 1955,
    display_items_total_amount: '$     19,55',
    sub_total: 1955,
    display_sub_total: 'MXN0',
    total_amount: 1955,
    display_total_amount: '$     19,55',
    items: [
      {
        name: 'Polo Shirt',
        image_url: 'https://cdn.stg.deuna.io/explore-deuna/assets/shirt.png',
        quantity: 1,
        price: 1955,
        slug: 'polo-shirt',
        displayPrice: '$ 19,10',
        productTitle: 'Camisa Polo',
        description:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean euismod bibendum laoreet.',
        brand: 'Generic Brand',
        category: 'Electronics',
        collections: ['Electronics', 'Headphones'],
        color: 'Black',
        details_url: '',
        id: '789456123',
        item_details: [],
        isbn: '123-456-789',
        manufacturer: 'Generic Manufacturer',
        options: 'string option',
        size: '',
        sku: 'HEADPH001',
        tax_amount: {
          original_amount: 0,
          discount_amount: 0,
          display_original_amount: '',
          amount: 0,
          currency: 'MXN',
          currency_symbol: '$',
          display_amount: '$ 19.55',
        },
        taxable: true,
        total_amount: {
          amount: 1955,
          discount_amount: 0,
          currency: 'MXN',
          currency_symbol: '$',
          display_amount: '$ 19,55',
          display_original_amount: '$ 19,55',
          original_amount: 0,
        },
        type: 'Electronics',
        unit_price: {
          original_amount: 1955,
          discount_amount: 0,
          display_original_amount: '',
          amount: 1955,
          currency: 'ARS',
          currency_symbol: '$',
          display_amount: '$ 19,55',
        },
        uom: 'Piece',
        upc: 'string',
        weight: {
          weight: 1,
          unit: 'kg',
        },
      },
    ],
    discounts: [],
    shipping_address: {
      first_name: 'Lisbaldy',
      last_name: 'Ojeda',
      phone: '+524444444444',
      identity_document: '12345678',
      identity_document_type: 'RFC',
      email: userEmail(),
      lat: -41.743,
      lng: 11.987,
      city: 'Arellano',
      zipcode: '1414',
      country: 'MX',
      country_code: 'MX',
      state_name: 'Aguascalientes',
      state_code: '',
      address1: '',
      address2: '',
      address_type: 'home',
      additional_description: 'El Mosco',
    },
    shipping_options: {
      type: 'delivery',
      details: {
        store_name: '',
        address: '',
        address_coordinates: {
          lat: 0,
          lng: 0,
        },
        contact: {
          name: '',
          phone: '',
        },
        additional_details: {
          pickup_time: '',
          stock_location: '',
        },
      },
    },
    user_instructions: 'This item is a gift.',
    status: '',
    redirect_url: '',
    total_discount: 0,
    display_total_discount: '',
    shipping_methods: [],
    timezone: '',
    scheduled_at: '',
    billing_address: {
      first_name: 'Lisbaldy',
      last_name: 'Ojeda',
      phone: '+524444444444',
      identity_document: '12345678',
      identity_document_type: 'RFC',
      email: userEmail(),
      lat: -41.743,
      lng: 11.987,
      city: 'Arellano',
      zipcode: '',
      country: 'MX',
      country_code: 'MX',
      state_name: 'Aguascalientes',
      state_code: '',
      address1: 'Av. Adolfo López Mateos 304, El Mosco, 20298 Villa Lic Jesús Terán',
      address2: '',
      address_type: 'home',
      additional_description: 'El Mosco',
    },
    payment_link: '',
    display_total_tax_amount: '',
    total_tax_amount: 0,
  },
};

const widgetConfig = {
  ...widgetsGeneralConfig,
  checkout_modules: [
    {
      name: 'BillingPattern',
      props: {
        fields: [
          {
            name: 'first_name',
            validation: {
              required: true,
            },
          },
          {
            name: 'last_name',
            validation: {
              required: true,
            },
          },
          {
            name: 'identity_document',
            validation: {
              required: true,
            },
          },
          {
            name: 'address1',
            validation: {
              required: true,
            },
          },
          {
            name: 'address2',
            validation: {
              required: false,
            },
          },
          {
            name: 'country',
            validation: {
              required: true,
            },
          },
          {
            name: 'state_name',
            validation: {
              required: true,
            },
          },
          {
            name: 'city',
            validation: {
              required: true,
            },
          },
          {
            name: 'zipcode',
            validation: {
              required: true,
            },
          },
        ],
        show_in_main_view: false,
      },
    },
  ],
};

test.describe('@regression Vault Checkout - Billing prefilled from order token + Split Payment', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;

  let orderToken: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    await apiCallNewman.configureVaultWidget(merchantId, merchantToken, {
      widgets_general_config: widgetConfig,
    });
    orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, payload)).data.token;
  });

  test(
    '@ENTP1-T2421 [Billing] Con datos incompletos de facturación para prediligenciar',
    {
      tag: ['@elements_link', '@split_payment', '@team_enterprise', '@preprod', '@checkout_ui'],
    },
    async ({ page }) => {
      const paymentPage = new PaymentPage(page);
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

      await test.step('Open the widget with Split Payment enabled', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios', true, true);
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          withSplitPayment: true,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        await paymentPage.clickOnPayButtonEmbedded();
      });

      await test.step('Validate billing button as "Cambiar" and open form', async () => {
        await paymentDeunaNowPage.assertBillingCheckboxIsVisible();
      });
    }
  );
});
