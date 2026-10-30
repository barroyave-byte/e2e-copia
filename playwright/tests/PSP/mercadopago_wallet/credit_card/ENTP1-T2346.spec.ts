import { Page, test } from '@support/fixtures';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as processorsConfig from '@support/interfaces/payment_processors';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FormsPage } from '@pages/explore/formsPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { MercadoPagoWalletPage } from '@pages/explore/forms/mercadoPagoWalletpage';
import { MPOrderPayload } from '../share/orderPayload';
import { configureMercadoPagoWallet } from '../share/setup';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Mercado Pago Wallet - Payment Canceled by User',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      const tokenized = await emaService.tokenizeOrderWithCustomBody(
        privateKey,
        MPOrderPayload as unknown as TokenizeOrderRequestData
      );
      orderToken = tokenized.data.token;
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        await configureMercadoPagoWallet(
          page,
          processorsConfig.buildMPWalletProcessor({
            exclude_payment_methods: [],
          }),
          merchantId
        );

        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2346 Mercado Pago Wallet - Payment Canceled by User',
      { tag: ['@team_payment_integration'] },
      async ({ page }) => {
        const formsPage = new FormsPage(page);
        const mainPage = new MercadoPagoWalletPage(page);

        const adminOrderPage = new AdminOrderDetailsPage(page);

        let mpWalletPopup: Page;
        let mpWalletPage: MercadoPagoWalletPage;

        await test.step('Step 1: Open popup and click back to site', async () => {
          const popupPromise = page.waitForEvent('popup', { timeout: 20_000 });

          await formsPage.selectProcessorToOpenModal('mercadoPagoWallet');
          await mainPage.assertLabelProcessingPaymentVisible();
          mpWalletPopup = await popupPromise;

          mpWalletPage = new MercadoPagoWalletPage(mpWalletPopup);

          await mpWalletPage.assertMercadoPagoWalletIsVisible();

          // Attach the close listener BEFORE the click that triggers it,
          // otherwise the popup may close before waitForEvent starts listening
          // and the wait hangs until timeout (flaky).
          const closePromise = mpWalletPopup.waitForEvent('close', {
            timeout: 20_000,
          });
          await mpWalletPage.clickOnBackToSite();
          await closePromise;
        });

        await test.step('Step 2: Verify order status is denied', async () => {
          await adminOrderPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderPage.assertPaymentStatus('denied');
        });
      }
    );
  }
);
