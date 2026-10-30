import { test, expect } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentPage } from '@pages/checkout/payment/paymentPage';
import { VoucherProcessorsPage } from '@pages/voucher/voucherProcessors';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchantCheckout = new ConfigMerchantCheckout();
const userEmail = EmailGenerator.generateRegisteredUserEmail();
const amount = 5000;

const BROKEN_IMAGE_URL = 'https://broken.invalid/qr.png';

test.describe(
  '@regression Deuna Wallet QR: errorApmMissingReference emitted with display_failed when QR image fails to load',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantCheckout.basicSetup('EC');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await apiCallNewman.createPaymentProcessor(
        {
          ...processorsConfig.deunaWalletProcessor,
          extra_params: {
            ...processorsConfig.deunaWalletProcessor.extra_params,
            format: 'qr',
          },
        },
        merchantId,
        merchantToken
      );

      const orderBody = DeunacheckoutOrderBuilder.createBody('EC', {
        amount,
        user_email: userEmail,
      });

      const tokenized = await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody);
      orderToken = tokenized.data.token;
    });

    test(
      '@ENTP1-T2606 errorApmMissingReference event emitted with display_failed when QR image fails to render',
      { tag: ['@team_enterprise', '@voucher'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const voucherProcessorsPage = new VoucherProcessorsPage(page);

        // Capture events via console.log intercepted from the testing tool main frame.
        // explore-deuna logs: console.log('onEventDispatch', eventType, eventData)
        // This avoids cross-origin iframe postMessage routing issues entirely.
        const capturedEventData = new Map<string, any>();
        page.on('console', async (msg) => {
          try {
            const args = msg.args();
            if (args.length >= 3) {
              const label = await args[0].jsonValue();
              if (label === 'onEventDispatch') {
                const eventType = await args[1].jsonValue();
                const eventData = await args[2].jsonValue();
                capturedEventData.set(eventType as string, eventData);
              }
            }
          } catch {
            // ignore serialization errors from non-JSON-serializable args
          }
        });

        await test.step('Should open the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
          await testingTool.navigateAndSetup({
            orderToken,
            merchantCredentials: { publicKey, privateKey },
          });
        });

        await test.step('Should intercept purchase response and replace QR token with broken URL', async () => {
          await page.route('**/transactions/purchase', async (route) => {
            const response = await route.fetch();
            const json = await response.json();

            const paymentData = json?.order?.payment?.data;

            // Patch both locations the backend may return the QR URL.
            // modular-checkout reads: paymentData?.authorization_bank_transfer?.qr
            //                     OR paymentData?.next_action?.authorization_bank_transfer?.qr
            if (paymentData?.next_action?.authorization_bank_transfer) {
              paymentData.next_action.authorization_bank_transfer.qr = BROKEN_IMAGE_URL;
            }
            if (paymentData?.authorization_bank_transfer) {
              paymentData.authorization_bank_transfer.qr = BROKEN_IMAGE_URL;
            }

            await route.fulfill({
              status: response.status(),
              headers: Object.fromEntries(Object.entries(response.headers())),
              body: JSON.stringify(json),
            });
          });

          await paymentPage.clickOnPayButton();
        });

        await test.step('Should wait for QR image element to be rendered', async () => {
          await voucherProcessorsPage.assertDeclarativeApmQrImageIsVisible();
        });

        await test.step('Should assert errorApmMissingReference event was emitted with display_failed', async () => {
          await expect
            .poll(() => capturedEventData.get('errorApmMissingReference'), { timeout: 15_000 })
            .toBeTruthy();

          const errorEventData = capturedEventData.get('errorApmMissingReference');

          // onEventDispatch(eventType, eventData) — eventData is the CheckoutEventsPayload directly
          expect(errorEventData).toBeTruthy();
          expect(errorEventData.metadata.errorType).toBe('display_failed');
          expect(errorEventData.metadata.errorCode).toBe('QR_IMAGE_LOAD_ERROR');
          expect(errorEventData.metadata.processorName).toBe('deuna_wallet');
          expect(errorEventData.metadata.methodType).toBe('bank_transfer');
        });
      }
    );
  }
);
