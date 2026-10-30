import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig, newElementsConfig } from '@support/mocks/newThemeConfig';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutModulesForWidgetConfig } from '@support/interfaces/CheckoutConfigurationV2';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { userEmail } from '@support/interfaces/orders';
import { randomUUID } from 'crypto';

const configMerchant = new ConfigMerchant();

const tokenizeOrderPayload = {
  order: {
    order_id: '{{$randomUUID}}',
    store_code: 'all',
    browser_details: {
      ip_address: '181.14.188.20',
      time_zone_offset: 180,
    },
    currency: 'MXN',
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
      first_name: '',
      last_name: '',
      phone: '',
      identity_document: '',
      identity_document_type: '',
      email: userEmail(),
      lat: 0,
      lng: 0,
      city: '',
      zipcode: '',
      country: 'MX',
      country_code: 'MX',
      state_name: '',
      state_code: '',
      address1: '',
      address2: '',
      address_type: 'home',
      additional_description: '',
    },
    billing_address: {
      first_name: '',
      last_name: '',
      phone: '',
      identity_document: '',
      identity_document_type: '',
      email: userEmail(),
      lat: 0,
      lng: 0,
      city: '',
      zipcode: '',
      country: 'MX',
      country_code: 'MX',
      state_name: '',
      state_code: '',
      address1: '',
      address2: '',
      address_type: 'home',
      additional_description: '',
    },
    display_total_tax_amount: '',
    total_tax_amount: 0,
  },
};

const checkout_modules: CheckoutModulesForWidgetConfig[] = [
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
          name: 'email',
          validation: {
            required: true,
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
        {
          name: 'identity_document',
          validation: {
            required: true,
          },
        },
      ],
      show_in_main_view: false,
    },
  },
];
const customThemeConfig = {
  BillingWithSameData: {
    translations: {
      es: {
        title: 'Datos de facturación personalizados',
      },
    },
  },
  BillingSummaryPattern: {
    translations: {
      es: {
        title: 'Datos de facturación personalizados',
      },
    },
  },
  BillingPattern: {
    translations: {
      es: {
        title: 'Datos de facturación personalizados',
      },
    },
  },
};
const generalWidgetConfig = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules,
  },
  elementsConfig: {
    ...newElementsConfig,
    theme_config: [
      {
        id: randomUUID(),
        name: 'theme_config',
        config: JSON.stringify(customThemeConfig),
      },
    ],
  },
};

test.describe(
  '@regression Flujo de guardado de tarjetas - El usuario no rellena los datos de facturación del formulario',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
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
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
      orderToken = (
        await emaService.tokenizeOrderWithCustomBody(privateKey, tokenizeOrderPayload as any)
      ).data.token;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mercadoPagoProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2307 Flujo de guardado de tarjetas - Mostrar error bajo el botón "Agregar datos" cuando se intenta pagar sin datos de facturacion cargados.',
      { tag: ['@smoke', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('User sees the vault widget form and fills credit card data', async () => {
          await vaultWidgetPage.assertTitleVisibleInMainView();

          await vaultWidgetPage.fillFormVault(creditCardData.mercadopagoMasterCardSuccessful, {
            avoidInstallmentsCall: true,
            country: 'MX',
          });
        });

        await test.step('User attempts to save card without filling billing data', async () => {
          await vaultWidgetPage.clickOnSave();
          await vaultWidgetPage.assertTextIsVisible(
            'Ingresa datos de facturación personalizados para continuar'
          );

          await vaultWidgetPage.assertButtonEnabled();
        });
      }
    );
  }
);
