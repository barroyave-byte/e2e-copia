import { withUniqueOrderAmount } from '@support/utils/uniqueOrderAmount';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
const globalAssert = new GlobalAssert();
import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { EmailGenerator } from '@support/utils/EmailGenerator';
import * as crypto from 'crypto';

const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();

const payloadOrder = {
  order: {
    order_id: crypto.randomUUID(),
    store_code: 'all',
    currency: 'MXN',
    items_total_amount: 500175,
    tax_amount: 0,
    sub_total: 500175,
    shipping_amount: 0,
    payment_method: 'credit_card',
    shipping_tax_amount: 0,
    total_tax_amount: 0,
    total_amount: 500175,
    shipping_methods: [
      {
        code: '12345JR',
        name: 'entregas Speed',
        cost: 0,
      },
    ],
    discounts: [],
    items: [
      {
        id: crypto.randomUUID(),
        name: 'Papas',
        description: 'Papas fritas con paprica',
        total_amount: {
          original_amount: 500175,
          amount: 500175,
          total_discount: 0,
          currency: 'MXN',
          currency_symbol: '$',
        },
        unit_price: {
          amount: 500175,
          currency: 'MXN',
          currency_symbol: '$',
        },
        tax_amount: {
          amount: 0,
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
      email: userEmail,
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
      email: userEmail,
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

test.describe('@regression Pays with MX MSI', () => {
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
      processorsConfig.fiservAuthorizeProcessorMSIMX,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createCampaignMSI('MXN', merchantId, merchantToken);
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
    '@PI-T1788 Authorize exitoso con Fiserv usando el API para MX con MSI Visa 3 meses',
    {
      tag: ['@payments_integration', '@team_payment_integration'],
      annotation: { type: 'bug', description: 'PI-3367' },
    },
    async ({ page }) => {
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const installments = '3';

      await test.step('User enters credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.fiservMastercardSuccessful,
          { country: 'MX' }
        );
      });

      await test.step('User select MSI', async () => {
        await paymentDeunaNowPage.selectInstallmentsMSI(installments);
      });

      await test.step('User select Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('Validates that the order has been placed correctly with the status of both the payment and the order', async () => {
        // Validate this http code and payment status
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('authorized', 200);
        // Validates the order status
        await paymentDeunaNowPage.assertEmaOrderStatus('succeeded');
        // Validate that when doing a get order, the status is correct.
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('authorized');
        await adminOrderDetailsPage.assertNumberOfInstallments(Number(installments));
        await adminOrderDetailsPage.assertTypeInstallments('MSI');
      });
    }
  );
});
