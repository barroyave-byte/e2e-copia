import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { AdminPaymentStrategyPage } from '@pages/admin/adminPaymentStrategyPage';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { ALLOW_STRIPE_DIRECT_CONFIGURATION } from '@support/http/testData/payment/PaymentMerchantConfigurations';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { RiskOption } from '@support/interfaces/riskOption';
import { AdminCommercePage } from '@pages/admin/commerce/adminCommercePage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import * as crypto from 'crypto';

const configMerchant = new ConfigMerchant();
const orderBody = {
  order: {
    order_id: crypto.randomUUID(),
    currency: 'MXN',
    timezone: 'America/Mexico_City',
    tax_amount: 30000,
    total_tax_amount: 120076,
    shipping_amount: 30000,
    items_total_amount: 30000,
    sub_total: 250366,
    processor_name: 'all',
    total_amount: 370442,
    store_code: 'all',
    payer_info: {
      date_of_birth: '2000-04-13T00:00:00.000Z',
    },
    browser_details: {
      screen_height: 101,
      screen_width: 303,
      color_depth: 20,
      java_enabled: true,
      java_script_enabled: true,
      language: 'en-US',
      time_zone_offset: 289,
      accept_header: '*/*',
    },
    webhook_urls: {
      notify_order: '',
      apply_coupon: '',
      remove_coupon: '',
      get_shipping_methods: '',
      update_shipping_method: '',
      shipping_rate: 'g',
    },
    billing_address: {
      id: 0,
      user_id: '',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+55+5299999999999',
      identity_document: '12345678',
      lat: 19.3600265,
      lng: -99.1574174,
      address1: 'José Luis Lagrange 456, Colonia Polanco',
      address2: 'José Luis Lagrange 456, Colonia Polanco',
      city: 'Brasilia',
      zipcode: '11510',
      state_name: '',
      country_code: 'MX',
      additional_description: '',
      address_type: '',
      is_default: false,
      created_at: '2024-06-17T22:09:09.086990957Z',
      updated_at: '2024-06-17T22:09:09.087014623Z',
      email: 'random@mail.com',
      identity_document_type: '',
    },
    shipping_address: {
      id: 0,
      user_id: '',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+55+5299999999999',
      identity_document: '12345678',
      lat: 19.3600265,
      lng: -99.1574174,
      address1: 'José Luis Lagrange 456, Colonia Polanco',
      address2: 'José Luis Lagrange 456, Colonia Polanco',
      city: 'Brasilia',
      zipcode: '11510',
      state_name: '',
      country_code: 'MX',
      additional_description: '',
      address_type: '',
      is_default: false,
      created_at: '2024-06-17T22:09:09.086990957Z',
      updated_at: '2024-06-17T22:09:09.087014623Z',
      email: 'random@mail.com',
      identity_document_type: '',
    },
    items: [
      {
        id: '79',
        name: '10 ALITAS VOLANTE',
        description: '10 alitas picantes',
        options: 'string option',
        total_amount: {
          amount: 1200,
          currency: 'MXN',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 850,
          currency: 'MXN',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 100,
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
        image_url: '',
        details_url: '',
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
        details_url: '',
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
  },
};

const merchantProfileBody = {
  merchant_profile: {
    merchant_id: '',
    name: '',
    processor_id: 3,
  },
  merchant_custom_information: {
    get_full_name_billing_address_uppercase: '31',
    metadata: {
      'additional_data.mdd_1': '1',
      'additional_data.mdd_2': '2',
      'additional_data.mdd_3': '3',
      'additional_data.mdd_4': '4',
      'additional_data.mdd_5': '5',
      'additional_data.mdd_7': '7',
      'additional_data.mdd_8': '8',
      'additional_data.mdd_13': '13',
      'additional_data.mdd_14': '14',
      'additional_data.mdd_15': '15',
      'additional_data.mdd_16': '16',
      'additional_data.mdd_17': '17',
    },
  },
  credentials: [
    {
      metadata_id: 1,
      value: 'c4159aba-9d6e-488f-87f8-8d21aecacc4d',
    },
    {
      metadata_id: 2,
      value: 'deuna_dm',
    },
    {
      metadata_id: 6,
      value: 'zcAcq8HrD4+DO+M7iJxoWfHpucAwJDNnh4Sc2jR52z8=',
    },
    {
      metadata_id: 7,
      value: 'test',
    },
    {
      metadata_id: 35,
      value: 'no',
    },
    {
      metadata_id: 36,
      value: 'no',
    },
  ],
};

test.describe('@regression Purchase with fraud status accepted', () => {
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  test.beforeAll(async ({ emaService, paymentService }) => {
    const merchant = await configMerchant.basicSetup('MX');
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    await paymentService.createConfigMerchantPayments(
      ALLOW_STRIPE_DIRECT_CONFIGURATION,
      merchantId,
      merchantToken
    );
    const response = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody as any);
    orderToken = response.data.token;
  });

  test(
    '@PF-T157 Purchase with status fraud accepted automatic_decision',
    { tag: ['@fraud', '@admin_connection', '@admin-preprod', '@team_payments_capabilities'] },
    async ({ page, guardService }) => {
      const adminHomePage = new AdminHomePage(page, 'ES');
      const adminLoginPage = new AdminLoginPage(page);
      const adminCommercePage = new AdminCommercePage(page, 'ES');
      const adminConnectionsPage = new AdminConnectionsPage(page, 'ES');
      const adminPaymentStrategyPage = new AdminPaymentStrategyPage(page, 'ES');
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The user opens the admin page and set merchant id session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user configures a Stripe connection', async () => {
        await adminHomePage.goToConnections();
        await adminConnectionsPage.configureConnection(
          ConnectionsAvailable.stripeDirect,
          processorsConfig.stripeProcessor
        );
      });

      await test.step('The user configures a Cybersource connection with merchant custom information', async () => {
        merchantProfileBody.merchant_profile.merchant_id = merchantId;
        merchantProfileBody.merchant_profile.name = merchantName;

        await guardService.createFraudProcessor(
          merchantToken,
          merchantId,
          merchantName,
          merchantProfileBody
        );
      });

      await test.step('The user goes to commerce to activate general fraud adjusts', async () => {
        await adminHomePage.goToCommerce();
        await adminCommercePage.activateManualReview();
        await adminCommercePage.activateOpsAutoExecution();
      });

      await test.step('The user select payment strategy', async () => {
        await adminHomePage.goToPaymentStrategy();
      });

      const risk: RiskOption[] = [
        {
          riskLevel: 'low',
          action: 'process',
          processor: {
            name: ConnectionsAvailable.stripeDirect,
            validateCvv: true,
            require3ds: false,
            actionForProcessor: 'decline',
          },
        },
      ];

      await test.step('The user create specific rules', async () => {
        await adminPaymentStrategyPage.editDefaultRouting(ConnectionsAvailable.cybersource, risk);
      });

      await test.step('The user open the widget and navigate to the payment page', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('Selecting user guest to avoid otp', async () => {
        await paymentDeunaNowPage.userGuest();
      });

      await test.step('The user enters the credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.stripeVisaSuccessfulFraudAprove,
          { country: 'MX' }
        );
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with fraud process status accepted', async () => {
        const status = 'processed';
        const fraudProcessStatus = 'accepted';
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
        await paymentDeunaNowPage.assertFraudProcessStatus(fraudProcessStatus, {
          privateKey,
          orderToken,
        });
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
      });
    }
  );
});
