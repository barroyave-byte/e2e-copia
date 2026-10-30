import { test } from '@support/fixtures';

import * as processorsConfig from '@support/interfaces/payment_processors';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { KueskipayPage } from '@pages/bnpl/kueskipayPage';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

test.describe(
  '@regression Kueski Pay Form Purchase - MX',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService }) => {
      const configMerchantCheckout = new ConfigMerchantCheckout();
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kueskiProcessor,
        merchantId,
        merchantToken
      );

      const orderBody = DeunacheckoutOrderBuilder.createBody('MX', { amount: 6000 });

      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test.fixme(
      '@ENTP1-T2034 Payment Form - Kueski Pay: Successful purchase',
      {
        tag: ['@installments', '@smoke', '@team_enterprise'],
        annotation: { type: 'bug', description: 'PI-3871' },
      },
      async ({ page }) => {
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        const paymentPage = new PaymentPage(page);
        let kueskipayPage: KueskipayPage;
        const installments: number = 1;

        await test.step('Should opens the testing page and the required form', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Should selects Kueski Pay as a Payement Method', async () => {
          await paymentPage.selectPaymentMethod('Kueski Pay');
        });

        await test.step('Should click on the Pay button to open the redirect widget', async () => {
          const kueskiPayPopupPromise = page.waitForEvent('popup');
          await paymentPage.clickOnPayButtonSummary();
          const kueskiPayPopup = await kueskiPayPopupPromise;
          kueskipayPage = new KueskipayPage(kueskiPayPopup);
        });

        await test.step('The order should be processed successfully with status code "200" and status "processing"', async () => {
          await paymentPage.assertOrderStatusRequestPurchase('processing', 200);
        });

        await test.step('Should login in Kueski Pay page', async () => {
          await kueskipayPage.completeLoginAction();
        });

        await test.step('You should click on the Buy button to make the payment', async () => {
          await kueskipayPage.clickOnButtonBuy();
        });

        await test.step('The thank you page should be displayed on the merchant', async () => {
          await paymentPage.assertThankyouPage('Pago completado');
        });

        await test.step('Should validate that the order details are correct', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed');
          await adminOrderDetailsPage.assertProcessorName(ConnectionsAvailable.kueskipay);
          await adminOrderDetailsPage.assertNumberOfInstallments(installments);
          await adminOrderDetailsPage.assertPaymentMethod('bnpl');
        });
      }
    );
  }
);
