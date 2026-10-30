import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';

import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminCommercePage } from '@pages/admin/commerce/adminCommercePage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { VOUCHER_LOGO_ORDER_CONFIG } from '@support/http/testData/checkout_configuration/VoucherLogoConfig';

const configMerchant = new ConfigMerchant();

let userEmail: string;

test.describe('@regression Voucher orden procesada', () => {
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

    userEmail = await apiCallNewman.createMerchantUserV2WithOutNework(
      'merchant_user',
      'all',
      merchantId,
      merchantToken
    );

    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createConfigurationV2(
      { orderConfig: VOUCHER_LOGO_ORDER_CONFIG },
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T508 Descarga de voucher',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin', '@admin_smoke'] },
    async ({ page }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminCommercePage = new AdminCommercePage(page);
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);

      await test.step('The superadmin user logs in', async () => {
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
      });

      await test.step('The superadmin goes to commerce page', async () => {
        await adminHomePage.goToCommerce();
      });

      await test.step('Configuration automatic send voucher page', async () => {
        await adminCommercePage.selectCommerceEmailTab();
        await adminCommercePage.configurationVoucher();
        await adminCommercePage.configurationVoucherSuccessful();
      });

      await test.step('The user open the widget and navigate to the payment page', async () => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      });

      await test.step('The user enters the credit card information', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.kushkiVisaSuccessfull, {
          country: 'MX',
        });
      });

      await test.step('The user clicks pay', async () => {
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
      });

      await test.step('It validates that the fraud decision is respectively correct: processor and status', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed');
      });

      await test.step('download voucher', async () => {
        const [popup] = await Promise.all([
          page.waitForEvent('popup'),
          adminCommercePage.downloadVoucher(),
        ]);
        await adminCommercePage.assertDownloadVoucher(popup);
      });
    }
  );
});
