import { test } from '@support/fixtures';
import * as creditCardData from '@support/interfaces/credit_cards';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { ServiceFactory, SERVICE_KEYS } from '@support/http';

test.describe(
  '@regression Payment Widget: PayU SDK Integration - SessionID is been send into purchase request',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, merchantPool }) => {
      const merchant = await merchantPool.acquire('DLOCAL_PROCESSOR_MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          antiFraudProviders: {
            PAYU: {},
          },
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2467 Payment Widget: PayU SDK Integration - SessionID is been send into purchase request',
      { tag: ['@payu', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('The user enters the credit card information', async () => {
          await paymentDeunaNowPage.fillCardForm(creditCardData.dlocalVisaCardSuccessfulWithRFC, {
            country: 'MX',
          });
        });

        await test.step('The user clicks pay', async () => {
          await paymentDeunaNowPage.clickPay();
        });
        await test.step('The sessionId is been send into purchase request with PayU', async () => {
          await paymentDeunaNowPage.assertDeviceIdInPurchaseRequest({
            antiFraudProvider: ['payu'],
          });
        });
      }
    );
  }
);
