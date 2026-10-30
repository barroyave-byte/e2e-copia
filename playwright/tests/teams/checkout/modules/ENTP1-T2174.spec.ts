import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK';
import { DeunanowTranslations } from '@support/translations/selectors/deunanow/deunanowTranslations';
import { getTranslations } from '@support/translations/getTranslations';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentPage as PaymentLinkPage } from '@pages/payment_link/payment/paymentPage';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';
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
          name: 'first_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'last_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'email',
          validation: {
            required: true,
          },
        },
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
          name: 'identity_document',
          validation: {
            required: false,
          },
        },
        {
          name: 'phone',
          validation: {
            required: true,
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
        {
          name: 'zipcode',
          validation: {
            required: true,
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
          phone: '+524442421245',
          identity_document: IDENTITY_DOCUMENTS.MX.RFC,
          currency: 'MXN',
          country_code: 'MX',
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
      '@ENTP1-T2174 Checkout - Billing Pattern: Ensure the pattern works when the billing pattern configurations are empty',
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

        await test.step('Should fills text inputs ', async () => {
          await paymentPage.fillBillingFormWithCustomValidation();
        });

        await test.step('The clicks on pay', async () => {
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('pending', 200);
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
