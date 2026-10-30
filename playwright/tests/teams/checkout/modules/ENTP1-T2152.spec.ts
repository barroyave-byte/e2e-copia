import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentPage as PaymentLinkPage } from '@pages/payment_link/payment/paymentPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import type { TokenizeOrderRequestData } from '@support/http/models/order';

const billingValidationOrderBody: TokenizeOrderRequestData = {
  order_type: 'DEUNA_CHECKOUT',
  checkout_modules: [
    {
      name: 'BillingPattern',
      props: {
        show_in_main_view: true,
        fields: [
          { name: 'first_name', validation: { required: true } },
          { name: 'last_name', validation: { required: true } },
          { name: 'email', validation: { required: true } },
          { name: 'phone', validation: { required: true } },
          { name: 'country', validation: { required: true } },
          { name: 'state_name', validation: { required: true } },
          { name: 'city', validation: { required: true } },
          { name: 'address1', validation: { required: true } },
          { name: 'zipcode', validation: { required: true } },
        ],
      },
    },
  ],
  order: {
    order_id: crypto.randomUUID(),
    store_code: 'all',
    currency: 'USD',
    items_total_amount: 1750,
    sub_total: 1750,
    total_amount: 1750,
    display_total_amount: 'USD 17.50',
    redirect_urls: {
      close: 'https://www.deuna.com/?q=close',
      error: 'https://www.deuna.com/?q=error',
      fallback: 'https://www.deuna.com/?q=fallback',
      pending: 'https://www.deuna.com/?q=pending',
      success: 'https://www.deuna.com/?q=success',
    },
    shipping_address: {
      first_name: 'Deuna',
      last_name: 'Testing',
      email: 'test.email.01@deuna.com',
      phone: '+524444444444',
    } as any,
    billing_address: {
      first_name: 'Deuna',
      last_name: 'Testing',
      email: 'test.email.01@deuna.com',
      phone: '+524444444444',
    } as any,
    items: [
      {
        id: '01',
        name: 'Juegos de la Muerte',
        description: 'Juegos de la muerte - Mitikah - 10/01/2024 22:10',
        options: '',
        total_amount: {
          amount: 1750,
          original_amount: 1750,
          display_amount: 'USD 17.50',
          display_original_amount: 'USD 17.50',
          currency: 'USD',
          total_discount: 0,
          display_total_discount: 'USD 0.00',
        },
        unit_price: { amount: 1750, display_amount: 'USD 17.50', currency: 'USD' },
        tax_amount: { amount: 0, display_amount: 'USD 0.00' },
        quantity: 1,
        sku: 'SKU-00001',
        brand: 'Bolt Swagstore',
        category: 'ticket',
        image_url: 'https://statics.cinemex.com/movie_posters/7uUQHyJhhUtmQlq-360x540.jpg',
        uom: '',
        upc: '',
        isbn: '',
        manufacturer: '',
        color: '',
        size: '',
        weight: { weight: 0, unit: 'kg' },
        details_url: '',
        type: 'physical',
        taxable: false,
        discounts: [],
        included_in_subscription: false,
      },
    ],
  },
};

const deunanowTranslations: DeunanowTranslations = getTranslations('deunanow', 'ES');

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

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('CASH_PROCESSOR_CHECKOUT_MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeOrderWithCustomBody(
        privateKey,
        billingValidationOrderBody
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

    test(
      '@ENTP1-T2152 | Checkout - Billing Pattern Customize Required Fields',
      { tag: ['@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const paymentLinkPage = new PaymentLinkPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const installments: number = 1;

        await test.step('Should clicks on Add Billing Address ', async () => {
          await paymentPage.assertButtonPayVisible();
          await paymentPage.showBillingFormIFrame();
        });

        await test.step('Should error if fields are not entirely filled', async () => {
          await paymentPage.fillBillingFormWithCustomValidation();
        });

        await test.step('Should success if all fields are filled correctly', async () => {
          await paymentPage.fillAddressAndZipcode({ address: 'Calle 123', zipCode: '12345' });
        });

        await test.step('The user clicks on pay', async () => {
          await paymentPage.clickOnPay(undefined, false, false);
        });

        await test.step('Should go to the order summary', async () => {
          await paymentLinkPage.assertThankyouPage(
            deunanowTranslations.screenThankYouPage.labelSuccessfulTitle
          );
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
