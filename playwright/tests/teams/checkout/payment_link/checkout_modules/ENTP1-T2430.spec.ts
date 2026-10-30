import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminConnectionsPage } from '@pages/admin/connections/adminConnectionsPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { ValidateEmailPage } from '@pages/payment_link/user_data/validateEmailPage';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { SafetypayPaymentLinkPage } from '@pages/checkout/safetypay';
import { SafetypayVoucherValidator } from '@pages/validators/safetypayVoucherValidator';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK';
import { MERCHANT_LOGO_WIDGETS_CONFIG } from '@support/http/testData/checkout_configuration/MerchantLogoConfig';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const email = EmailGenerator.generateRegisteredUserEmail();
declare const window: Window & { disablePolling: any };

class SafetypayPaymentFlow {
  constructor(
    private paymentPage: PaymentPage,
    private safetypayPage: SafetypayPaymentLinkPage,
    private validator: SafetypayVoucherValidator
  ) {}

  async completePayment() {
    await this.paymentPage.clickOnSafetypayTab();
    await this.paymentPage.clickOnPayAndValidate(this.validator);
  }

  async verifyVoucherGeneration() {
    await this.safetypayPage.assertReferenceLoading();
    await this.safetypayPage.waitForSafetyPayIframe();
    await this.safetypayPage.assertWaitingConfirmation();
  }

  async verifyOrderSummaryWithVoucher() {
    await this.safetypayPage.clickButtonSeeOrderSummary();
    await this.safetypayPage.assertTransactionSteps();
    await this.safetypayPage.waitForSafetyPayIframe();
    await this.safetypayPage.assertWaitingConfirmation();
  }
}

test.describe(
  '@regression PaymentLink: Safetypay Direct',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.safetypayProcessor,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBody({
          user_email: email,
          checkout_modules: [
            { name: 'LoginPattern' },
            {
              name: 'OrderDetailPattern',
            },
          ],
        })
      );
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig: MERCHANT_LOGO_WIDGETS_CONFIG },
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2430 PaymentLink: Safetypay Direct',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const adminPages = {
          login: new AdminLoginPage(page),
          home: new AdminHomePage(page),
          connections: new AdminConnectionsPage(page),
          orderDetails: new AdminOrderDetailsPage(page),
        };

        await test.step('Given Safetypay processor is configured in admin', async () => {
          await adminPages.login.gotoAdmin();
          await adminPages.home.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('When guest user initiates payment with Safetypay', async () => {
          await page.addInitScript(() => {
            window.disablePolling = true;
          });

          const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });

          const paymentLinkPage = await page.waitForEvent('popup', { timeout: 20_000 });

          // Setup payment pages
          const validateEmailPage = new ValidateEmailPage(paymentLinkPage);
          const paymentPage = new PaymentPage(paymentLinkPage);
          const safetypayPage = new SafetypayPaymentLinkPage(paymentLinkPage);
          safetypayPage.overrideWidgetPage(paymentLinkPage);

          const safetypayFlow = new SafetypayPaymentFlow(
            paymentPage,
            safetypayPage,
            new SafetypayVoucherValidator()
          );

          await test.step('And enters email as guest', async () => {
            await validateEmailPage.enterEmail(email);
            await validateEmailPage.clickOnContinue();
          });

          await test.step('And submits payment with Safetypay', async () => {
            await safetypayFlow.completePayment();
          });

          await test.step('Then Safetypay voucher is generated', async () => {
            await safetypayFlow.verifyVoucherGeneration();
          });

          await test.step('And voucher persists in order summary', async () => {
            await safetypayFlow.verifyOrderSummaryWithVoucher();
          });
        });

        // Assert - Final verification
        await test.step('Then payment status is pending in admin panel', async () => {
          await adminPages.orderDetails.goToOrderDetails(merchantId, orderToken);
          await adminPages.orderDetails.assertPaymentStatus('pending');
        });
      }
    );
  }
);
