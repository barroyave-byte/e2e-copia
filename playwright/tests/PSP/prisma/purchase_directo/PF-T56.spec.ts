import { EmailGenerator } from '@support/utils/EmailGenerator';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import * as crypto from 'crypto';

const configMerchant = new ConfigMerchant();

const order_id = crypto.randomUUID();
const userEmail = EmailGenerator.generatePayerEmail();

const body_sent = {
  order_type: 'AIRLINE_ORDER',
  order: {
    order_id: order_id,
    currency: 'ARS',
    timezone: 'America/Buenos_Aires',
    tax_amount: 10000,
    shipping_amount: 10000,
    items_total_amount: 10000,
    sub_total: 10000,
    processor_name: 'all',
    total_amount: 10000,
    store_code: 'all',
    items: [
      {
        unit_price: {
          original_amount: 10000,
          discount_amount: 0,
          display_original_amount: '',
          amount: 10000,
          currency: 'ARS',
          currency_symbol: '$',
          display_amount: '$ 100.00',
        },
        total_amount: {
          amount: 10000,
          discount_amount: 0,
          currency: 'ARS',
          currency_symbol: '$',
          display_amount: '$ 100.00',
          display_original_amount: '$ 100.00',
          original_amount: 0,
        },
        tax_amount: {
          original_amount: 0,
          discount_amount: 0,
          display_original_amount: '',
          amount: 0,
          currency: 'ARS',
          currency_symbol: '$',
          display_amount: '$ 0.00',
        },
        taxable: false,
        id: 'IT001',
        name: 'Prueba',
        description: 'Description',
        quantity: 1,
      },
    ],
    discounts: [],
    shipping_options: {
      type: 'delivery',
    },
    billing_address: {
      city: 'Buenos Aires',
      country_code: 'AR',
      email: userEmail,
    },
    shipping_address: {
      city: 'Buenos Aires',
      country_code: 'AR',
      email: userEmail,
    },
    airline_information: {
      booking_items: [
        {
          ticketing_travel_agency: {
            iata_code: 'ABC123',
          },
        },
      ],
    },
  },
};

test.describe('@regression Purchase exitoso con airline data Prisma Payway con SITE ID de aerolínea', () => {
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;

  test.beforeAll(async ({ emaService }) => {
    // create merchant for a country
    const merchant = await configMerchant.basicSetup('AR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey; // MX, CO, PE, CL or other
    publicKey = merchant.publicKey;
    // tokenize order type deunanow (payment widget)
    const tokenized = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      body_sent as unknown as TokenizeOrderRequestData
    );
    orderToken = tokenized.data.token; // you can use another collection for tokenize order
    // create payment processor
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.prismaPaywayProcessorAirlineAgency,
      merchantId,
      merchantToken
    );
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

  test.fixme(
    '@PF-T56 Purchase exitoso con airline data Prisma Payway con SITE ID de aerolínea',
    {
      tag: ['@payments_integration', '@team_payment_integration'],
      annotation: { type: 'bug', description: 'PI-3254' },
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('User enters credit card information', async () => {
        // Fill credit card data in payment widget
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.prismaPaywayVisaSuccessful,
          { country: 'AR' }
        );
      });

      await test.step('User select Pay', async () => {
        // Click pay button
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        // Validate that the request /purchase sent from the UI is correct.
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
        // Validate that when doing a get order, the status is correct.
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed');
      });
    }
  );
});
