import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentPage as PaymentLinkPage } from '@pages/payment_link/payment/paymentPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const deunanowTranslations: DeunanowTranslations = getTranslations('deunanow', 'ES');
const email = EmailGenerator.generateRegisteredUserEmail();
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
        {
          name: 'address1',
          validation: {
            required: false,
          },
        },
        {
          name: 'address2',
          validation: {
            required: false,
          },
        },
      ],
    },
  },
];

test.describe(
  '@regression Checkout - Billing Pattern',
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
      const merchant = await merchantPool.acquire('CASH_PROCESSOR_CHECKOUT_MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBody({
          user_email: email,
          phone: '+5930987654321',
          state_name: 'MEX',
          city: 'San Alejo',
          checkout_modules,
        })
      );
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
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
      '@ENTP1-T2274 Checkout - Billing Pattern: Validate special characters and blank space fields',
      { tag: ['@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const paymentLinkPage = new PaymentLinkPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const installments: number = 1;

        await test.step('Should clicks on Add Billing Address ', async () => {
          await paymentPage.showBillingFormIFrame();
        });

        await test.step('Should fill the fields with test data', async () => {
          await paymentPage.fillCountryBillingForm(false);
          await paymentPage.fillNameAndAddress({
            firstName: '    John    ',
            lastName: '    ',
            address: '$$$%%%###',
          });
        });

        await test.step('Should not save the form and show errors', async () => {
          await paymentPage.clickSaveButton();
          await paymentPage.assertMXErrorsArePresent();
        });

        await test.step('Should fill the fields with correct data and save', async () => {
          await paymentPage.fillNameAndAddress({
            firstName: '    John    ',
            lastName: '   Doe   ',
            address: 'Calle 123',
          });
          await paymentPage.clickSaveButton();
        });

        await test.step('Should clic on pay and check the billing data is correct in the purchase payload (withouth blank spaces)', async () => {
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('pending', 200);
          await paymentPage.assertBillingAddressInPurchaseOrder('Calle 123');
          await paymentPage.assertFirstAndLastNameInPurchaseOrder('John', 'Doe');
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
