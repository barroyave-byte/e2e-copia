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
import { paypalACDCCampaignsMCI } from '@support/interfaces/campaigns/campaignsObject';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';

const configMerchant = new ConfigMerchant();

const orderID = crypto.randomUUID();
const userEmail = EmailGenerator.generatePayerEmail();

const payload = {
  order: {
    order_id: `${orderID.toString()}`,
    currency: 'MXN',
    timezone: 'America/Mexico_City',
    total_tax_amount: 2000,
    shipping_amount: 2000,
    sub_total: 50000,
    discount_amount: 2000,
    processor_name: 'all',
    total_amount: 52000,
    store_code: 'all',
    payer_info: {
      email: userEmail,
    },
    items: [
      {
        id: '79',
        name: '10 ALITAS VOLANTE',
        description: '10 alitas picantes',
        options: 'string option',
        total_amount: {
          amount: 48000,
          currency: 'MXN',
          currency_symbol: '$',
          original_amount: 50000,
          total_discount: 2000,
        },
        unit_price: {
          amount: 48000,
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
    shipping_address: {
      email: userEmail,
      identification: '050623568956198',
      id: 12,
      user_id: 'ebd6105c-b2ae-11eb-8529-0242ac130003',
      first_name: 'FRANCO2',
      last_name: 'MIDENCE',
      phone: '593986100449',
      identity_document: '1150218418',
      lat: -0.100032,
      lng: -78.46956,
      address1: 'Av. Eloy Alfaro 15, Quito 170515, Ecuador SHIPPING 2 Purchase',
      address2: 'Av. Eloy Alfaro 16, Quito 170515, Ecuador',
      city: 'San Pedro Sula',
      zipcode: '170515',
      state_name: 'CRT',
      country: 'MX',
      additional_description: 'Descripción adicional',
      address_type: 'home',
      is_default: false,
      created_at: '2021-11-03T22:09:09.086990957Z',
      updated_at: '2021-11-03T22:09:09.087014623Z',
    },
    billing_address: {
      email: userEmail,
      identification: '050623568956124',
      id: 13,
      user_id: 'ebd6105c-b2ae-11eb-8529-0242ac130003',
      first_name: 'NELSON',
      last_name: 'JIMENEZ',
      phone: '593986100449',
      identity_document: '1150218418',
      lat: -0.100032,
      lng: -78.46956,
      address1: 'Av. Eloy Alfaro 20, Quito 170515, Ecuador BILLING Purchase',
      address2: 'Av. Eloy Alfaro 20, Quito 170515, Ecuador',
      city: 'Quito',
      zipcode: '170515',
      state_name: 'CRT',
      country: 'MX',
      additional_description: 'Descripción adicional',
      address_type: 'home',
      is_default: false,
      created_at: '2021-11-03T22:09:09.086990957Z',
      updated_at: '2021-11-03T22:09:09.087014623Z',
    },
    total_discount: 2000,
  },
};

test.describe('@regression Pays with PayPal ACDC MX using IC2B', () => {
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
    const tokenized = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      payload as unknown as TokenizeOrderRequestData
    );
    orderToken = tokenized.data.token;

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.paypalACDCProcessorWithIC2B,
      merchantId,
      merchantToken
    );
  });

  test.fixme(
    '@PI-T1879 Purchase exitoso con installments MCI (IC2B) con descuentos - costos de envío e impuestos en México',
    {
      tag: ['@installments', '@team_payment_integration'],
      annotation: { type: 'bug', description: 'PI-4195' },
    },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');
      const adminConsolitedFlows = new AdminConsolidatedFlows(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');
      const installments = '9';

      await test.step('Merchant configures campaign from Admin', async () => {
        await adminConsolitedFlows.goToAdminAndSetMerchantId(merchantId);
        await adminConsolitedFlows.configureInstallmentCampaign(paypalACDCCampaignsMCI);
      });

      await test.step('The user opens the testing page and opens the required widget', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('User enters credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
          creditCardData.paypalACDCVisaSucessful,
          { country: 'MX' }
        );
      });

      await test.step('User selects 9 months MCI installments plan', async () => {
        await paymentDeunaNowPage.selectInstallmentsMCI(installments);
      });

      await test.step('User selects Pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed and the number as well as type of installments is as expected', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed');
        await adminOrderDetailsPage.assertNumberOfInstallments(Number(installments));
        await adminOrderDetailsPage.assertTypeInstallments('MCI');
      });
    }
  );
});
