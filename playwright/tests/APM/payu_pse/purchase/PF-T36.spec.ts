import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { expect, test } from '@support/fixtures';
import * as crypto from 'crypto';
import { PayuPseRedirectionPage } from '@pages/explore/redirections/payuPseRedirectionPage';
import { retryGetOrderStatus } from '@support/utils/retries';

const globalAssert = new GlobalAssert();
const orderID = crypto.randomUUID();

const payload = {
  order: {
    order_id: `${orderID.toString()}`,
    currency: 'COP',
    timezone: 'America/Bogota',
    total_tax_amount: 100000,
    shipping_amount: 300000,
    items_total_amount: 300000,
    sub_total: 200000,
    processor_name: 'payu_pse',
    total_amount: 300000,
    store_code: 'all',
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
        quantity: 2,
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
    billing_address: {
      first_name: 'Alexander',
      last_name: 'Gomez',
      email: 'agoe@gmail.com',
      identification: '14201225',
      identification_type: 'CC',
      phone: '+578315263363',
      address1: 'Avenida Carrera 72 80',
      address2: '94',
      zipcode: '110110',
      city: 'Bogota',
      state_name: 'Bogota',
      country: 'CO',
    },
    shipping_address: {
      first_name: 'Alexander ',
      last_name: 'Gomez',
      email: 'agoe@gmail.com',
      identification: '14201225',
      identification_type: 'CC',
      phone: '+578315263363',
      address1: 'Avenida Carrera 72 80',
      address2: '94',
      zipcode: '110110',
      city: 'Bogota',
      state_name: 'Bogota',
      country: 'CO',
    },
    user_instructions: 'This item is a gift.',
  },
};

const purchasePayload = {
  token: '',
  method_type: 'bank_transfer',
  processor_name: 'payu_pse',
  callback_url: 'https://example.com/',
  billing_address: {
    first_name: 'Alexander',
    last_name: 'Gomez',
    email: 'agoe@gmail.com',
    identification: '14201225',
    identification_type: 'CC',
    phone: '+578315263363',
    address1: 'Avenida Carrera 72 80',
    address2: '94',
    zipcode: '110110',
    city: 'Bogota',
    state_name: 'Bogota',
    country: 'CO',
  },
  shipping_address: {
    first_name: 'Alexander',
    last_name: 'Gomez',
    email: 'agoe@gmail.com',
    identification: '14201225',
    identification_type: 'CC',
    phone: '+578315263363',
    address1: 'Avenida Carrera 72 80',
    address2: '94',
    zipcode: '110110',
    city: 'Bogota',
    state_name: 'Bogota',
    country: 'CO',
  },
  payer_info: {
    email: 'test@deuna.com',
    person_type: 'NATURAL_PERSON',
  },
  specific_fields: {
    financial_institution: '1022',
    financial_institution_name: 'BANCO UNION COLOMBIANO',
  },
  browser_details: {
    ip_address: '127.0.0.1',
    user_agent: 'PostmanRuntime/7.42.0',
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let userAuthToken: string;

  test.beforeAll(async ({ emaService, merchantPool }) => {
    const merchant = await merchantPool.acquire('PAYU_PSE_PROCESSOR_CO');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;

    userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);

    const tokenized = await emaService.tokenizeOrderWithCustomBody(
      privateKey,
      payload as unknown as TokenizeOrderRequestData
    );
    orderToken = tokenized.data.token;
  });

  test(
    '@PF-T36 Purchase declinado con Payu PSE usando el API en Colombia',
    { tag: ['@team_payconnect', '@team_payment_integration', '@team_enterprise'] },
    async ({ emaService, context, paymentService }) => {
      let redirectURL: string;
      const redirectionPage = await context.newPage();

      await test.step('The user tokenizes the order and performs a purchase', async () => {
        purchasePayload.token = orderToken;

        const purchaseResponse = (
          await paymentService.purchase(privateKey, userAuthToken, purchasePayload as any)
        ).data as any;
        expect(purchaseResponse).toBeDefined();

        const paymentData = purchaseResponse.order.payment.data;
        expect(paymentData).toBeDefined();

        const nextAction = paymentData.next_action;
        expect(nextAction).toBeDefined();

        const authorizationBankTransfer = nextAction.authorization_bank_transfer;
        expect(authorizationBankTransfer).toBeDefined();
        expect(authorizationBankTransfer.redirect_url).toBeDefined();

        redirectURL = authorizationBankTransfer.redirect_url;
      });

      await test.step('The user is redirected to perform the bank transafer process', async () => {
        await redirectionPage.goto(redirectURL);

        const payuPseRedirection = new PayuPseRedirectionPage(redirectionPage);
        await payuPseRedirection.processRedirection({ status: 'FAILED' });
      });

      await test.step('The user is redirected to after completing bank transfer process', async () => {
        expect(redirectionPage.url()).toContain(purchasePayload.callback_url);
        await redirectionPage.close();
      });

      await test.step('It is validated that the order has been processed successfully with status denied', async () => {
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'denied');
      });
    }
  );
});
