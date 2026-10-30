import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';

import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { Challenge3dsPage } from '@pages/checkout/3ds/challenge3dsPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { DeunaPaymentLinkOrderBuilder } from '@support/http/testData/ema/DEUNA_PAYMENTLINK/DeunaPaymentLinkOrderBuilder';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const email = EmailGenerator.generateRegisteredUserEmail();
const widgetGeneralsConfig = {
  user_experience: {
    render_3ds_strategy: 'redirect',
  },
};
const checkout_modules = [
  {
    name: 'OrderDetailPattern',
    props: {
      hide_product_image: true,
    },
  },
];

test.describe(
  '@regression 3DS with payment processor Stripe - Payconnect  MX',
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
        processorsConfig.stripe3dsProcessor,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaPaymentLinkOrderWithCustomBody(
        privateKey,
        DeunaPaymentLinkOrderBuilder.createBody({
          user_email: email,
          country: 'MX',
          checkout_modules: checkout_modules,
        })
      );
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.createConfigurationV2(
        { widgetGeneralsConfig },
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2375 Payment Link: 3DS Redirect Shows Modal and Completes in different tab',
      { tag: ['@team_enterprise'] },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup', { timeout: 10000 });
        const paymentPage = new PaymentPage(paymentLinkPage);

        await test.step('The user fills credit card information', async () => {
          await paymentPage.fillCreditCardDataWithBase(creditCardData.stripe3dsPass, {
            country: 'MX',
          });
        });

        await test.step('The user clicks on pay button', async () => {
          await paymentPage.clickOnPay();
          await paymentPage.assertOrderStatusRequestPurchase('processed', 200, {
            disableBodyVerification: true,
          });
        });

        await test.step('3DS challenge url redirect strategy', async () => {
          const page3DS = await paymentLinkPage.waitForEvent('popup', { timeout: 10000 });
          const challenge3ds = new Challenge3dsPage(await page3DS);

          await challenge3ds.selectPassChallengeStripe();
        });
      }
    );
  }
);
