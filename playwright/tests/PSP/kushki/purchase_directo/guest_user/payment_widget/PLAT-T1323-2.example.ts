import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant_memoize';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { test } from '@support/fixtures';
import { TestingFramework } from 'playwright/framework/core';

test.describe('@regression Pay Form DeunaNow Success Credit Card', () => {
  let orderToken: string;
  let publicKey: string;
  let privateKey: string;
  let merchantId: string;

  test.beforeAll(async ({ emaService }) => {
    const merchant = await ConfigMerchant.basicSetup('MX', processorsConfig.kushkiProcessor);
    ({ publicKey, privateKey, merchantId } = merchant);
    orderToken = (await emaService.tokenizeDeunaNowOrder('MX', privateKey)).data.token;
  });

  test(
    '@PLAT-T1323 Compra exitosa con procesador KUSHKI TC-MASTER usuario invitado- DEUNA NOW',
    {
      tag: ['@payments_integration', '@team_payment_integration', '@healthcheck'],
    },
    async ({ page }) => {
      const testing = new TestingFramework({ page, test });

      await testing.run({
        step: [
          { action: 'admin.navigate.goToAdminPage' },
          {
            action: 'checkout.openCheckout',
            params: {
              privateKey: privateKey,
              publicKey: publicKey,
              orderToken: orderToken,
              experienceType: 'Payment Widget',
            },
          },
          {
            action: 'checkout.paymentWidget.fillCreditCardData',
            params: { creditCardData: creditCardData.kushkiMasterCardExitosa },
          },
          {
            action: 'checkout.paymentWidget.clickPay',
          },
          {
            action: 'admin.orders.goToOrder',
            params: { merchantId: merchantId, orderToken: orderToken },
          },
          {
            action: 'admin.orders.assertStatus',
            params: { status: 'processed' },
          },
        ],
      });

      // const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
      // const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      // await test.step('The user navigates to the payment widget screen as guest user', async () => {
      //   const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
      //   await testingTool.navigateAndSetup();
      // });
      // await test.step('User inserts Credit Card for DeunaNow', async () => {
      //   await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
      //     creditCardData.kushkiMasterCardExitosa
      //   );
      // });
      // await test.step('User select Pay', async () => {
      //   await paymentDeunaNowPage.clickPay();
      // });
      // await test.step('It is validated that the order has been processed successfully with status processed', async () => {
      //   const status = 'processed';
      //   await paymentDeunaNowPage.assertOrderStatusRequestPurchase(status, 200);
      //   await adminOrderDetailsPage.goToOrderDetails();
      //   await adminOrderDetailsPage.assertPaymentStatus(status);
      // });
    }
  );
});
