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
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { avoidAntibot } from '@support/utils/avoidAntibot';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();

const email = EmailGenerator.generateRegisteredUserEmail();

test.describe(
  '@regression Validate payment functionality from checkout',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    // Redsys rejects 3DS (SIS0754) when the browser timezone offset is 0 (UTC CI runners):
    // payconnect drops the zero-valued time_zone_offset. Pin a Spanish shopper timezone.
    test.use({ timezoneId: 'Europe/Madrid' });
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
        DeunaPaymentLinkOrderBuilder.createBodyFromCommerce({
          country: 'ES',
          user_email: email,
          currency: 'EUR',
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
        await avoidAntibot(page);
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        1;
      }
    );

    test(
      '@ENTP1-T2055 Payment Link: Redsys 3DS Success Challenge',
      {
        tag: ['@team_enterprise'],
      },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup');
        const paymentPage = new PaymentPage(paymentLinkPage);
        const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
        let redsys3DSPage: Redsys3dsPage;

        await test.step('The user fills credit card information', async () => {
          await paymentPage.fillCreditCardDataWithBase(creditCardData.redsysCreditCardChallenge);
        });

        await test.step('The user clicks on pay button', async () => {
          // paymentPage.threeDSUrlAwaiter();
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('processed', 200, {
            disableBodyVerification: true,
          });
        });

        await test.step('3DS challenge url generate', async () => {
          // await paymentPage.assert3dsResponseSuccess();
          const redsysPopup = await paymentLinkPage.waitForEvent('popup');
          redsys3DSPage = new Redsys3dsPage(await redsysPopup);
        });

        await test.step('The user completes 3DS challenge', async () => {
          await redsys3DSPage.clickOnSubmitChallenge();
        });

        await test.step('order is processed successfully', async () => {
          await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderDetailsPage.assertPaymentStatus('processed', 10);
        });
      }
    );
  }
);
