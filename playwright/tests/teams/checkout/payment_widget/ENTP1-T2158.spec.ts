import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import { randomUUID } from 'crypto';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
const orderID = randomUUID();
const payload = {
  order: {
    order_id: `${orderID.toString()}`,
    store_code: 'all',
    browser_details: {
      ip_address: '',
      time_zone_offset: 240,
    },
    currency: 'MXN',
    tax_amount: 0,
    display_tax_amount: '$     90.00',
    shipping_amount: 0,
    display_shipping_amount: 'MXN0,00',
    items_total_amount: 9000,
    display_items_total_amount: '$     90.00',
    sub_total: 9000,
    display_sub_total: 'MXN0',
    total_amount: 9000,
    display_total_amount: '$     90.00',
    items: [
      {
        name: 'Sun Glasses',
        image_url: 'https://cdn.stg.deuna.io/explore-deuna/assets/sunglasses.png',
        quantity: 1,
        price: 9000,
        displayPrice: '$ 90.00',
        slug: 'sun-glasses',
        productTitle: 'Gafas de Sol',
        description:
          'Surf, arena y gafas de sol: la perfección del verano. Estas gafas de sol aviadoras protegen tus valiosos ojos de los peligrosos rayos UV, de día o de noche. Además: te hacen lucir bastante genial.',
        brand: 'Sunshine Co.',
        category: 'Accessories',
        collections: ['Summer Collection', 'Accessories'],
        color: 'Brown',
        details_url: '',
        id: '963852741',
        item_details: [],
        isbn: '',
        manufacturer: 'Sunshine Co.',
        options: 'string option',
        size: '',
        sku: 'SUNGLS001',
        tax_amount: {
          original_amount: 0,
          discount_amount: 0,
          display_original_amount: '',
          amount: 0,
          currency: 'MXN',
          currency_symbol: '$',
          display_amount: '$ 0.00',
        },
        taxable: true,
        total_amount: {
          amount: 9000,
          discount_amount: 0,
          currency: 'MXN',
          currency_symbol: '$',
          display_amount: '$ 90.00',
          display_original_amount: '$ 90.00',
          original_amount: 0,
        },
        type: 'Accessories',
        unit_price: {
          original_amount: 9000,
          discount_amount: 0,
          display_original_amount: '',
          amount: 9000,
          currency: 'MXN',
          currency_symbol: '$',
          display_amount: '$ 90.00',
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
      first_name: 'John',
      last_name: 'Doe',
      phone: '21988939196',
      identity_document: '12345678',
      lat: -41.743,
      lng: 11.987,
      address1: 'José Luis Lagrange 456, Colonia Polanco',
      address2: 'José Luis Lagrange 456, Colonia Polanco',
      city: 'Ciudad de México',
      zipcode: '11510',
      state_name: 'Miguel Hidalgo',
      country_code: 'MX',
      additional_description: '',
      address_type: 'home',
      identity_document_type: 'RFC',
      email: 'john@doe.com',
      state_code: '',
      country: 'MX',
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
        additional_details: {},
      },
    },
    user_instructions: 'This item is a gift.',
    metadata: {
      'additional_data.cinema_id': '348',
      'additional_data.city': 'Ciudad de Mexico',
      'additional_data.cinema_type': 'VIP',
      'additional_data.total_tickets': '2',
      'additional_data.channel_id': 'ANDROID',
      'additional_data.tcc': '1303030753560897',
      'additional_data.loyalty_level': 'FAN',
      'additional_data.movie_name': 'Barbie',
      'additional_data.movie_format': 'SUB',
      'additional_data.runtime': '159 min',
      'additional_data.total_food_items': '0',
      'additional_data.order_type': 'tickets',
    },
    status: '',
    redirect_url: '',
    total_discount: 0,
    display_total_discount: '',
    shipping_methods: [],
    timezone: '',
    scheduled_at: '',
    billing_address: {
      first_name: 'John',
      last_name: 'Doe',
      phone: '21988939196',
      identity_document: '12345678',
      lat: -41.743,
      lng: 11.987,
      address1: 'José Luis Lagrange 456, Colonia Polanco',
      address2: 'José Luis Lagrange 456, Colonia Polanco',
      city: 'Ciudad de México',
      zipcode: '11510',
      state_name: 'Miguel Hidalgo',
      country_code: 'MX',
      additional_description: '',
      address_type: '',
      identity_document_type: 'RFC',
      email: userEmail,
      state_code: '',
      country: 'MX',
    },
    payment_link: '',
    display_total_tax_amount: '',
    total_tax_amount: 0,
    airline_information: {
      bookingItems: [
        {
          pnr: 'KFA123',
          ticket_number: '100458790',
          e_ticket: true,
          ticketing_travel_agency: {
            iata_code: 'TRA123',
            name: 'Expedia',
          },
          passenger: {
            user_id: 'a566037e-1892-4f25-8c2b-2e616140f256',
            first_name: 'Gustavo',
            middle_name: 'Eduardo',
            last_name: 'Mena',
            document_type: 'DNI',
            identity_document_number: '07277747',
            email: 'gmena@deuna.com',
            phone: '+14155688537',
            frequent_flyer_code: '51434591833',
            title: 'Mr',
            date_of_birth: '1985-12-31',
            country_code: 'PE',
          },
          legs: [
            {
              origin: {
                iata_code: 'SEA',
                date: '2024-02-01',
                time: '12:00',
              },
              destination: {
                iata_code: 'LAX',
                date: '2024-02-01',
                time: '18:00',
              },
              carrier_code: 'Y4',
              carrier_name: 'Volaris',
              flight_number: 'VO899',
              seat_location: '3C',
              fare_basis_code: 'J',
              stopover_code: '',
              sub_total_amount: 2500,
              tax_amount: 250,
              total_amount: 2750,
            },
            {
              origin: {
                iata_code: 'LAX',
                date: '2024-02-01',
                time: '23:00',
              },
              destination: {
                iata_code: 'SEA',
                date: '2024-02-02',
                time: '07:00',
              },
              carrier_code: 'Y4',
              carrier_name: 'Volaris',
              flight_number: 'VO489',
              seat_location: '4C',
              fare_basis_code: 'J',
              stopover_code: '',
              sub_total_amount: 2500,
              tax_amount: 250,
              total_amount: 2750,
            },
          ],
        },
        {
          pnr: 'KFA123',
          ticket_number: '100458790',
          e_ticket: true,
          ticketing_travel_agency: {
            iata_code: 'TRA123',
            name: 'Expedia',
          },
          passenger: {
            user_id: '4ad314b0-ab6d-4cf2-8ed1-d26ee6a35237',
            first_name: 'Lourdes',
            middle_name: 'Daniela',
            last_name: 'Montenegro',
            document_type: 'DNI',
            identity_document_number: '70326536',
            email: userEmail,
            phone: '+14155797662',
            frequent_flyer_code: '51703265363',
            title: 'Ms',
            date_of_birth: '1989-04-21',
            country_code: 'PE',
          },
          legs: [
            {
              origin: {
                iata_code: 'SEA',
                date: '2024-02-01',
                time: '12:00',
              },
              destination: {
                iata_code: 'LAX',
                date: '2024-02-01',
                time: '18:00',
              },
              carrier_code: 'Y4',
              carrier_name: 'Volaris',
              flight_number: 'VO899',
              seat_location: '3C',
              fare_basis_code: 'J',
              stopover_code: '',
              sub_total_amount: 2500,
              tax_amount: 250,
              total_amount: 2750,
            },
            {
              origin: {
                iata_code: 'LAX',
                date: '2024-02-01',
                time: '23:00',
              },
              destination: {
                iata_code: 'SEA',
                date: '2024-02-02',
                time: '07:00',
              },
              carrier_code: 'Y4',
              carrier_name: 'Volaris',
              flight_number: 'VO489',
              seat_location: '4C',
              fare_basis_code: 'J',
              stopover_code: '',
              sub_total_amount: 2500,
              tax_amount: 250,
              total_amount: 2750,
            },
          ],
        },
      ],
    },
  },
  order_type: 'AIRLINE_ORDER',
};

test.describe(
  '@regression PaymentWidget: Compra exitosa con Tarjeta UATP guardada previamente',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let userToken: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      // Register user and set address
      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.uatpSuccess.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      // Set credit card for user
      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.uatpSuccess,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);

      // Tokenize order with registered user
      const tokenized = await emaService.tokenizeOrderWithCustomBody(
        privateKey,
        payload as unknown as TokenizeOrderRequestData
      );
      orderToken = tokenized.data.token;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.uatpProcessor,
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
          userToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2158 PaymentWidget: Compra exitosa con Tarjeta UATP guardada previamente',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        await test.step('The user clicks pay', async () => {
          await paymentDeunaNowPage.clickPay();
        });

        await test.step('It is validated that the order has been processed successfully with status pending', async () => {
          const status = 'processing';
          await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus(status);
        });
      }
    );
  }
);
