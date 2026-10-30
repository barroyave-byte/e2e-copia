import { test } from '@support/fixtures';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { PayuPseRedirectionPage } from '@pages/bank_transfer/psePayuPage';
import { FormsPage } from '@pages/explore/formsPage';
import { PayuPseFormPage } from '@pages/explore/forms/payuPseFormPage';
import { randomUUID } from 'crypto';
import { getOrderForPollingResponse } from '@support/utils/share/order/orderForPolling';
import { userDataCO } from '@support/interfaces/user_data';

const orderID = randomUUID();
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

test.describe(
  '@regression Happy Path Payu PSE Checkout Base Forms',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('PAYU_PSE_PROCESSOR_CHECKOUT_CO');
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
      orderId = tokenized.data.order.order_id;
    });

    test.beforeEach('Should opens the testing page and the required form', async ({ page }) => {
      const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
      await testingTool.navigateAndSetup({
        orderToken: orderToken,
        merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
      });
    });

    test(
      '@ENTP1-T2053 Checkout Base: Payu PSE Denied Purchase',
      { tag: ['@smoke_gmv', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const formsPage = new FormsPage(page);
        const psePayuFormPage = new PayuPseFormPage(page);
        let psePayuPage: PayuPseRedirectionPage;

        await test.step('Should selects Payu PSE as a Payement Method', async () => {
          await paymentPage.selectPaymentMethod('Payu PSE');
        });

        await test.step('Should open Payu PSE Form', async () => {
          await formsPage.clickOnPay();
        });

        await test.step('Should fill the form with the required data', async () => {
          await psePayuFormPage.fillPsePayuForm({
            ...userDataCO,
            bankName: 'BANCO UNION COLOMBIANO',
          });
        });

        await test.step('Should click on the Pay button to open the redirect widget', async () => {
          await psePayuFormPage.clickOnPay();
          const psePayuPopUpPage = page.waitForEvent('popup');
          psePayuPage = new PayuPseRedirectionPage(await psePayuPopUpPage);
        });

        await test.step('Should deny the payment', async () => {
          await psePayuPage.processTransfer({ status: 'FAILED' });
        });

        await test.step('Polling responds with status denied', async () => {
          psePayuFormPage.interceptPollingResponse(
            {
              status: 200,
              body: {
                order: getOrderForPollingResponse({
                  orderId: orderId,
                  orderToken: orderToken,
                  paymentStatus: 'denied',
                  orderStatus: 'pending',
                }),
              },
            },
            orderToken
          );
        });
      }
    );
  }
);
