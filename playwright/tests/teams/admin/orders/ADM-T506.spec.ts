import { expect, test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';

import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { AdminCommercePage } from '@pages/admin/commerce/adminCommercePage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { MessageFeed } from '@support/utils/MessageFeed';
import { VOUCHER_LOGO_ORDER_CONFIG } from '@support/http/testData/checkout_configuration/VoucherLogoConfig';

const configMerchant = new ConfigMerchant();
const messageFeed = new MessageFeed();

let userEmail;
let inboxObj: Awaited<ReturnType<typeof messageFeed.createNewEmail>> | null = null;

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
    inboxObj = await messageFeed.createNewEmail();

    const email = inboxObj.email;
    const tokenized = await emaService.tokenizeDeunaPaymentLinkOrder('MX', privateKey, {
      user_email: email,
      order_id: `test_order_${Math.floor(Math.random() * 9999999)}`,
    });
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

  test.fixme(
    '@ADM-T506 Voucher orden procesada',
    {
      annotation: { type: 'bug', description: 'PF-3774' },
      tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin', '@admin_smoke'],
    },
    async ({ page }) => {
      const adminLoginPage = new AdminLoginPage(page);
      const adminHomePage = new AdminHomePage(page);
      const adminCommercePage = new AdminCommercePage(page);
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

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
        await page.waitForTimeout(1000);
        await paymentDeunaNowPage.clickPay();
      });

      await test.step('It is validated that the order has been processed successfully with status processed', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('processed', 200);
      });
      await test.step('the user read email automatic', async () => {
        await page.waitForTimeout(5000);
        const inbox = inboxObj?.inbox;
        const regex = /Fecha generación del voucher/;
        userEmail = await messageFeed.getDeunaVoucherEmail({ inbox, unreadOnly: false }, regex);
        expect(userEmail).not.toBeNull();
      });
    }
  );
});
