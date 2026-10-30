import { test } from '@deuna/test';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import { Redsys3dsPage } from '@pages/checkout/3ds/redsys3dsPage';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();

const email = EmailGenerator.generateRegisteredUserEmail();

declare const window: Window & { disablePolling: any };

test.describe(
  '@regression Validate payment functionality from checkout',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async () => {
      const merchant = await configMerchantCheckout.basicSetup('ES');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await apiCallNewman.createPaymentProcessor(
        processorsConfig.redsysProcessor,
        merchantId,
        merchantToken
      );

      const emaService = ServiceFactory.getService(SERVICE_KEYS.EMA);
      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBody({
          country: 'ES',
          user_email: email,
          order_id: `test_order_${Math.floor(Math.random() * 9999999)}`,
        })
      );
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createCheckoutModulesConfig(
        [
          {
            name: 'OrderDetailPattern',
          },
        ],
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        await page.addInitScript(() => {
          window.disablePolling = true;
        });
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test.fixme(
      '@ENTP1-T2109 Payment Link: Redirección a redirect_urls.error tras fallo de pago en 3DS',
      {
        tag: ['@team_enterprise'],
        annotation: { type: 'bug', description: 'ENTP1-12651' },
      },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup', { timeout: 10000 });
        const paymentPage = new PaymentPage(paymentLinkPage);
        let redsys3DSPage: Redsys3dsPage;

        await test.step('The user fills credit card information', async () => {
          await paymentPage.fillCreditCardDataWithBase(creditCardData.redsysCreditCardChallenge);
        });

        await test.step('The user clicks on pay button', async () => {
          paymentPage.threeDSUrlAwaiter();
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('processed', 200, {
            disableBodyVerification: true,
          });
        });

        await test.step('3DS challenge url generate', async () => {
          await paymentPage.assert3dsResponseSuccess();
          const redsysPopup = await paymentLinkPage.waitForEvent('popup', { timeout: 10000 });
          redsys3DSPage = new Redsys3dsPage(await redsysPopup);
        });

        await test.step('Toggle deny challenge', async () => {
          await redsys3DSPage.toggleDenyChallenge();
        });

        await test.step('The user can see error redirect_url', async () => {
          await redsys3DSPage.clickOnSubmitChallenge();
        });
        await test.step('The user completes 3DS challenge', async () => {
          await page.waitForTimeout(5000);
          await paymentPage.assertCurrentPageIsRedirectStatusUrl('error');
        });
      }
    );
  }
);
