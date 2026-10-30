import { test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { kushkiVisaSuccessfull } from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();

const email = EmailGenerator.generateRegisteredUserEmail();
const checkout_modules = [
  {
    name: 'BillingPattern',
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

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrder('MX', privateKey, {
        user_email: email,
        phone: '+523014565498',
        checkout_modules: checkout_modules,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessorAuthorize,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2308 Checkout - Billing Pattern assert fallback option for states without cities',
      {
        tag: [
          '@admin_connection',
          '@admin-preprod',
          '@preprod',
          '@checkout_ui',
          '@team_enterprise',
        ],
      },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);

        await test.step('The user opens the admin page To configure a merchant and its connections', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
          await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
        });

        await test.step('The user goes the testing page and opens the required widget', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should clicks on Add Billing Address ', async () => {
          await paymentPage.assertButtonPayVisible();

          await paymentPage.showBillingFormIFrame();
        });

        await test.step('Should select a country with a state without cities options', async () => {
          await paymentPage.changeCountry('AR');
        });

        await test.step('Should fill the form selecting the specific state without errors', async () => {
          await paymentPage.fillBillingFormWithFallbackOption('AR');
        });

        await test.step('The user enters the credit card information and completes the purchase', async () => {
          await paymentPage.clearAndFillCreditCard(kushkiVisaSuccessfull, { country: 'MX' });
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('authorized', 200);
        });

        await test.step('Should confirm that the city is in the order payload', async () => {
          await paymentPage.assertCityInPurchaseOrder('Ciudad Autónoma de Buenos Aires');
        });
      }
    );
  }
);
