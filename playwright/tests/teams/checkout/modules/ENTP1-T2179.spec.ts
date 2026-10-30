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
      fields: [],
      overrideCountryFields: {
        US: [
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
            name: 'zipcode',
            validation: {
              required: true,
            },
          },
          {
            name: 'phone',
            validation: {
              required: true,
            },
          },
          {
            name: 'state_name',
          },
          {
            name: 'city',
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
              required: true,
            },
          },
          {
            name: 'address1',
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
            name: 'additional_description',
          },
          {
            name: 'identity_document',
          },
        ],
        MX: [
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
            name: 'zipcode',
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
            name: 'first_name',
            validation: {
              required: false,
            },
            label: {
              es: 'Primer nombre (opcional)',
              en: 'First name (optional)',
            },
          },
          {
            name: 'last_name',
            validation: {
              required: true,
            },
          },
          {
            name: 'address1',
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
            name: 'additional_description',
          },
          {
            name: 'identity_document',
          },
        ],
        CR: [
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
            name: 'phone',
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
              required: true,
            },
          },
          {
            name: 'address1',
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
            name: 'additional_description',
          },
          {
            name: 'identity_document',
          },
        ],
        GT: [
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
            name: 'phone',
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
              required: true,
            },
          },
          {
            name: 'address1',
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
            name: 'additional_description',
          },
          {
            name: 'identity_document',
          },
        ],
        SV: [
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
            name: 'phone',
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
              required: true,
            },
          },
          {
            name: 'address1',
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
            name: 'additional_description',
          },
          {
            name: 'identity_document',
          },
        ],
        CO: [
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
            name: 'zipcode',
            validation: {
              required: true,
            },
          },
          {
            name: 'phone',
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
              required: true,
            },
          },
          {
            name: 'address1',
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
            name: 'additional_description',
          },
          {
            name: 'identity_document',
          },
        ],
        EC: [
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
            name: 'zipcode',
            validation: {
              required: true,
            },
          },
          {
            name: 'phone',
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
              required: true,
            },
          },
          {
            name: 'address1',
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
            name: 'additional_description',
          },
          {
            name: 'identity_document',
          },
        ],
      },
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
      '@ENTP1-T2179 Checkout - BIlling Pattern Assert Custom Fields Purchase Payload',
      { tag: ['@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const paymentLinkPage = new PaymentLinkPage(page);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

        await test.step('Should clicks on Add Billing Address ', async () => {
          await paymentPage.assertButtonPayVisible(); //wait for order to load completely
          await paymentPage.showBillingFormIFrame();
        });

        await test.step('Should show the correct country fields ', async () => {
          await paymentPage.assertLabelsFor('MX');
        });

        await test.step('Should not close the form if the user clicks on save without filling the required fields ', async () => {
          await paymentPage.clickSaveButton();
        });

        await test.step('Should validate the fields', async () => {
          await paymentPage.assertMXErrorsArePresent();
        });

        await test.step('Should change the selected country and ensure that the labels and validation errors are displayed correctly', async () => {
          await paymentPage.changeCountry('CO');
          await paymentPage.clickSaveButton();
          await paymentPage.assertLabelsFor('CO');
          await paymentPage.clearZipcode();
          await paymentPage.assertInvalidZipCodeError();
        });

        await test.step('Should fill the fields correctly and save', async () => {
          await paymentPage.fillPhoneBilling('3181234567');
          // The step saves once, at the end: filling the country fields must not save too
          await paymentPage.fillCountryBillingForm(false);
          await paymentPage.fillAddressAndZipcode({ address: 'Calle 123', zipCode: '1300011232' });
        });

        await test.step('Should clic on pay and check the billing data is correct in the purchase payload', async () => {
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('pending', 200);
          await paymentPage.assertBillingAddressInPurchaseOrder('Calle 123');
          await paymentPage.assertZipCodeInPurchaseOrder('1300011232');
          await paymentPage.assertPhoneInPurchaseOrder('+573181234567');
          await paymentPage.assertEmailInPurchaseOrder(email);
          await paymentPage.assertFirstAndLastNameInPurchaseOrder('John', 'Doe');
          await paymentPage.assertCountryInPurchaseOrder('CO');
        });

        await test.step('Should go to the order summary', async () => {
          await paymentLinkPage.assertThankyouPage(
            deunanowTranslations.screenThankYouPage.labelSuccessfulTitle
          );
        });

        await test.step('Should validates that the order detail is correct', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('pending');
        });
      }
    );
  }
);
