import { Response, test } from '@support/fixtures';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminPaymentLinkPage } from '@pages/admin/payment_link/adminPaymentLinkPage';
import {
  PaymentLink,
  PaymentLinksResponse,
} from '@pages/admin/payment_link/interfaces/paymentLink';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { AdminPaymentLinkDetailsPage } from '@pages/admin/payment_link/adminPaymentLinkDetailsPage';
import { AdminPaymentLinkFormPage } from '@pages/admin/payment_link/adminPaymentLinkFormPage';
import { calculateProductsAmount, calculateTotalAmount } from './utils/products';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe('@regression Should display payment link row for an existing payment link', () => {
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
  });
  test(
    '@ADM-T551 Should display payment link row for an existing payment link',
    {
      tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin', '@preprod', '@admin_ui'],
    },
    async ({ page }) => {
      const adminHomePage = new AdminHomePage(page);
      const adminLoginPage = new AdminLoginPage(page);
      const adminPaymentLinkPage = new AdminPaymentLinkPage(page);
      const adminPaymentLinkFormPage = new AdminPaymentLinkFormPage(page);
      const adminPaymentLinkDetailsPage = new AdminPaymentLinkDetailsPage(page);

      const paymentLinkName = 'Payment link with payment retries limit';
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
      const totalAmount = calculateTotalAmount(products, amounts.taxAmount, amounts.shippingAmount);

      await test.step('Open admin page and set merchant ID in session', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('Navigate to Payment Link page and assert page loaded', async () => {
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

      await test.step('The user clicks on Create payment link submit button', async () => {
        await adminPaymentLinkFormPage.submitForm();
        await adminPaymentLinkFormPage.assertPaymentLinkCreationModal({
          expectedAmount: totalAmount,
          localeData,
        });
        await adminPaymentLinkFormPage.copyModalPaymentLink();
        await adminPaymentLinkFormPage.closeModal();
      });

      let paymentLinksPromise: Promise<Response>;
      await test.step('Navigate back to Payment Link page and assert page loaded', async () => {
        paymentLinksPromise = adminPaymentLinkPage.waitForPaymentLinksResponse();
        await adminPaymentLinkDetailsPage.clickGoBackButton();
        await adminPaymentLinkPage.assertToBeInPaymentLinkPage();
      });

      let paymentLinksData: PaymentLinksResponse;
      await test.step('Fetch payment links data and assert response', async () => {
        paymentLinksData = await adminPaymentLinkPage.getPaymentLinksData(paymentLinksPromise);
        await adminPaymentLinkPage.assertPaymentLinksNotEmpty(paymentLinksData);
      });

      let item: PaymentLink | undefined;
      await test.step('Find payment link by name and assert row visible', async () => {
        item = adminPaymentLinkPage.findPaymentLinkByName(paymentLinksData, paymentLinkName);
        await adminPaymentLinkPage.assertPaymentLinkRowVisible(item!.payment_link_id);
      });
    }
  );
});
