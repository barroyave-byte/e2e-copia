import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentPage as PaymentLinkPage } from '@pages/payment_link/payment/paymentPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { randomUUID } from 'crypto';
import { CheckoutEventsName } from '@tests/events/checkoutEventsName';

const configMerchantCheckout = new ConfigMerchantCheckout();

const orderID = randomUUID();
const checkout_modules = [
  {
    name: 'BillingPattern',
    props: {
      show_in_main_view: false,
      fields: [
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
          name: 'first_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'last_name',
          validation: {
            required: false,
          },
        },
      ],
    },
  },
];
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
  checkout_modules: checkout_modules,
};

test.describe(
  '@regression Checkout - Billing Pattern',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.cashProcessor,
        merchantId,
        merchantToken
      );

      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, payload as any);
      orderToken = tokenized.data.token;
    });

    test(
      '@ENTP1-T2285 Checkout - Billing Pattern: Validate the country set in billing address is in the final payload',
      { tag: ['@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const paymentLinkPage = new PaymentLinkPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const installments: number = 1;

        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });

        await test.step('Should clicks on Add Billing Address ', async () => {
          await paymentPage.assertEventWasFired(CheckoutEventsName.paymentMethodsEntered);
          await paymentPage.showBillingFormIFrame();
        });

        await test.step('Should fill the fields with test data', async () => {
          await paymentPage.fillCountryBillingForm(false);
        });

        await test.step('Should fill the fields with correct data and save', async () => {
          await paymentPage.clickSaveButton();
        });

        await test.step('Should clic on pay and check the billing data is correct in the purchase payload (withouth blank spaces)', async () => {
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('pending', 200);
          await paymentPage.assertCountryInPurchaseOrder('CO');
        });

        await test.step('Should go to the order summary', async () => {
          await paymentLinkPage.assertDeunanowThankyouPage();
        });

        await test.step('Should validates that the order detail is correct', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('pending');
          await adminOrderDetailsPage.assertNumberOfInstallments(installments);
        });
      }
    );
  }
);
