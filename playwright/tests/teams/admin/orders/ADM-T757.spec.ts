import { test } from '@support/fixtures';
import { faker } from '@faker-js/faker';

import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';

const configMerchant = new ConfigMerchant();

const generateComplexMetadata = () => ({
  [faker.string.uuid()]: faker.string.alpha(10),
  [faker.string.uuid()]: faker.string.alpha(15),
  [faker.string.uuid()]: 'SUMMER2024',
  [faker.string.uuid()]: null,
  [faker.string.uuid()]: undefined,
  [faker.string.uuid()]: true,
  [faker.string.uuid()]: false,
  [faker.string.uuid()]: faker.number.int(),
  [faker.string.uuid()]: faker.number.float(),
  [faker.string.uuid()]: faker.date.recent(),
  additional_data: {
    commercial_condition: 'installments_enabled',
    risk_score: 85,
    is_first_purchase: false,
  },
  tags: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.lorem.word()),
  custom_fields: {
    store_branch: faker.company.name(),
    sales_rep: faker.person.fullName(),
    priority_level: faker.number.int({ min: 1, max: 5 }),
  },
  tracking: {
    utm_source: faker.company.name(),
    utm_medium: faker.lorem.word(),
    utm_campaign: faker.lorem.word(),
  },
  nested: {
    level1: {
      level2: {
        level3: {
          [faker.string.uuid()]: faker.number.int(),
          [faker.string.uuid()]: faker.lorem.sentence(),
          [faker.string.uuid()]: faker.date.recent().toISOString(),
        },
      },
    },
  },
});

const getOrderBodyWithComplexMetadata = () => {
  const metadata = generateComplexMetadata();
  const bodySent = {
    order_type: 'PAYMENT_LINK',
    order: {
      order_id: crypto.randomUUID(),
      currency: 'ARS',
      timezone: 'America/Buenos_Aires',
      tax_amount: 250000,
      shipping_amount: 250000,
      items_total_amount: 250000,
      sub_total: 250000,
      processor_name: 'all',
      total_amount: 250000,
      store_code: 'all',
      items: [
        {
          id: '79',
          name: '10 ALITAS VOLANTE',
          description: faker.lorem.sentence(),
          options: 'string option',
          total_amount: {
            amount: 1200,
            currency: 'ARS',
            currency_symbol: '$',
          },
          unit_price: {
            amount: 850,
            currency: 'ARS',
            currency_symbol: '$',
          },
          tax_amount: {
            amount: 100,
            currency: 'ARS',
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
            lat: faker.number.float({ min: -90, max: 90 }),
            lng: faker.number.float({ min: -180, max: 180 }),
          },
          contact: {
            name: faker.person.fullName(),
            phone: faker.phone.number(),
          },
          additional_details: {
            pickup_time: faker.date.recent().toISOString(),
            stock_location: '',
          },
        },
      },
      user_instructions: 'This item is a gift.',
      metadata: metadata,
    },
  };

  return bodySent;
};

let privateKey: string;
let publicKey: string;
let orderToken: string;
let merchantId: string;
let merchantToken: string;
let merchantName: string;

test.describe('@regression Validate order metadata visualization in admin order details', () => {
  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('AR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.prismaPaywayProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T757 Validate that complex metadata is displayed correctly in the order details drawer',
    { tag: ['@admin', '@orders', '@team_admin', '@admin-preprod', '@preprod', '@admin_ui'] },
    async ({ page, emaService }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const bodySent = getOrderBodyWithComplexMetadata();

      await test.step('Create an order with complex multi-level metadata', async () => {
        const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, bodySent as any);
        orderToken = tokenized.data.token;
      });

      await test.step('Display the Payment Widget and navigate to it', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey, privateKey },
        });
      });

      await test.step('Fill credit card data and complete payment', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.prismaPaywayVisaSuccessful,
          { country: 'AR' }
        );
      });

      await test.step('Click on pay button', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validate that the order has been processed successfully', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
      });

      await test.step('Navigate to order details in admin', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed');
      });

      await test.step('Click on view metadata link', async () => {
        await adminOrderDetailsPage.clickOnViewMetadataLink();
      });

      await test.step('Validate that the metadata drawer is visible and contains the expected data', async () => {
        await adminOrderDetailsPage.assertMetadataContent(bodySent.order.metadata);
      });
    }
  );
});
