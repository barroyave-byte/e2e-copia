import { test, Page } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { AdminPaymentLinkPage } from '@pages/admin/payment_link/adminPaymentLinkPage';
import { AdminPaymentLinkFormPage } from '@pages/admin/payment_link/adminPaymentLinkFormPage';
import { AdminPaymentLinkDetailsPage } from '@pages/admin/payment_link/adminPaymentLinkDetailsPage';
import { calculateProductsAmount, calculateTotalAmount } from './utils/products';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { ValidateEmailPage } from '@pages/payment_link/user_data/validateEmailPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { paymentLinkCheckoutModules } from '@support/utils/checkoutModules';
import * as userData from '@support/interfaces/user_data';
import { GuestUserDataPage } from '@pages/payment_link/user_data/guestUserDataPage';

const configMerchantCheckout = new ConfigMerchantCheckout();

let validateEmailPage: ValidateEmailPage;
let paymentPage: PaymentPage;
let newPage: Page;
let transactionId: string;
let guestUserPage: GuestUserDataPage;

const userEmail = `${Math.floor(Math.random() * 9999999)}.qa@testuser.com`;

test.describe('@regression feature to validate with the automated test case', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchantCheckout.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createCheckoutModulesConfig(
      paymentLinkCheckoutModules,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T682 Create payment link with checkout config',
    { tag: ['@team_admin', '@admin-preprod'] },
    async ({ browser }) => {
      const context = await browser.newContext({
        permissions: ['clipboard-read', 'clipboard-write'],
      });
      const page = await context.newPage();

      // admin
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminPaymentLinkPage = new AdminPaymentLinkPage(page);
      const adminPaymentLinkFormPage = new AdminPaymentLinkFormPage(page);
      const adminPaymentLinkDetailsPage = new AdminPaymentLinkDetailsPage(page);

      const paymentLinkName = 'Payment link with max completed purchases limit';
      const products = [
        { productName: 'Product 1', productAmount: '1000' },
        { productName: 'Product 2', productAmount: '2000' },
      ];
      const localeData = {
        countryCode: 'MX',
        currency: 'MXN',
        locale: 'es',
      };
      const amounts = {
        taxAmount: '0',
        shippingAmount: '0',
        productsAmount: calculateProductsAmount(products),
      };
      const maxCompletedPurchasesLimit = '1';
      const totalAmount = calculateTotalAmount(products, amounts.taxAmount, amounts.shippingAmount);

      await test.step('The user logs in the admin', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The user goes to payment link page', async () => {
        await adminHomePage.goToPaymentLink();
        await adminPaymentLinkPage.assertToBeInPaymentLinkPage();
      });

      await test.step('The user clicks on create a new payment link', async () => {
        await adminPaymentLinkPage.navigateToCreatePaymentLink();
        await adminPaymentLinkFormPage.assertToBeInCreatePaymentLinkPage();
      });

      await test.step('The user fills the payment link template name', async () => {
        await adminPaymentLinkFormPage.fillProductLinkName(paymentLinkName);
        await adminPaymentLinkFormPage.assertPaymentLinkNameFilled(paymentLinkName);
      });

      await test.step('The user add a products', async () => {
        await adminPaymentLinkFormPage.addSeveralProducts(products);
        await adminPaymentLinkFormPage.assertSeveralProducts({
          products,
          localeData,
        });
      });

      await test.step('The user adds a max completed purchases limit', async () => {
        await adminPaymentLinkFormPage.addMaxCompletedPurchasesLimit(maxCompletedPurchasesLimit);
        await adminPaymentLinkFormPage.assertMaxCompletedPurchasesLimitAdded(
          maxCompletedPurchasesLimit
        );
      });

      await test.step('The user clicks on Create payment link submit button', async () => {
        await adminPaymentLinkFormPage.submitForm();
        await adminPaymentLinkFormPage.assertPaymentLinkCreationModal({
          expectedAmount: totalAmount,
          localeData,
        });
        await adminPaymentLinkFormPage.copyModalPaymentLink();
        await adminPaymentLinkFormPage.closeModal();
      });

      await test.step('The user is redirected to the payment link details page', async () => {
        await adminPaymentLinkDetailsPage.assertToBeInDetailsPage();
        await adminPaymentLinkDetailsPage.assertLinkDetails({
          templateName: paymentLinkName,
        });

        await adminPaymentLinkDetailsPage.assertSeveralProductsDetails({
          products,
          localeData,
        });

        await adminPaymentLinkDetailsPage.assertDetailsSummary({
          localeData,
          totalAmount,
          amounts,
        });
      });

      await test.step('The user clicks on copy link button', async () => {
        await adminPaymentLinkDetailsPage.clickCopyInformationButton();
        await adminPaymentLinkDetailsPage.assertLinkCopiedCorrectly({ page });
      });

      await test.step('The user opens a new tab, paste the copied link and go', async () => {
        const originalPageCount = context.pages().length;

        [newPage] = await Promise.all([context.newPage(), context.waitForEvent('page')]);

        await adminPaymentLinkDetailsPage.assertNewTabOpened(context, originalPageCount);
        const copiedLink = await page.evaluate(() => navigator.clipboard.readText());
        await newPage.goto(copiedLink);
        await newPage.waitForLoadState('domcontentloaded');

        validateEmailPage = new ValidateEmailPage(newPage);
        paymentPage = new PaymentPage(newPage);
        guestUserPage = new GuestUserDataPage(newPage);
      });

      await test.step('The user fills the email input in the checkout and clicks on continue button', async () => {
        await validateEmailPage.enterEmail(userEmail);
        await validateEmailPage.clickOnContinue();
      });

      await test.step('The user fills user information', async () => {
        await guestUserPage.enterGuestUserDataWithDelay(userData.userDataMX);
      });

      await test.step('The user fills credit card information', async () => {
        await paymentPage.fillCreditCardDataWithBase(creditCardData.kushkiVisaSuccessfull);
      });

      await test.step('The user inputs zip code and address', async () => {
        await paymentPage.enterBillingZipCode(userData.userDataMX.zipcode);
        await paymentPage.enterBillingAddress1(userData.userDataMX.address1);
      });

      await test.step('user sees terms and conditions', async () => {
        await paymentPage.assertUserSeeTermsAndConditions();
      });

      await test.step('The user clicks on purchase', async () => {
        await paymentPage.clickOnPay();
        await paymentPage.assertOrderStatusRequestPurchase('processed', 200);
        transactionId = await paymentPage.getTransactionId();
      });

      await test.step('The user goes back to payment link details view', async () => {
        await page.bringToFront();
      });

      await test.step('The user reloads the view and check the created order in orders table', async () => {
        await page.reload();
        const orderId = transactionId.replace(/^#/, '');
        await adminPaymentLinkDetailsPage.assertHasOrderRowById(orderId);
      });
    }
  );
});
