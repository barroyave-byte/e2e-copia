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
import { mpWalletPaymentMethods } from '@pages/admin/connections/processors';
import { MERCADOPAGO_WALLET_CREDENTIALS } from '../share/credentials';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Mercado Pago Wallet - Processing Efecty Payment',
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
            exclude_payment_methods: [
              mpWalletPaymentMethods.debitCard,
              mpWalletPaymentMethods.creditCard,
              mpWalletPaymentMethods.bankTransfer,
            ],
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

    test.fixme(
      '@ENTP1-T2359 Mercado Pago Wallet - Processing Efecty Payment',
      {
        annotation: { type: 'bug', description: 'ENTP1-16571' },
        tag: ['@payment_widget', '@flaky', '@team_payment_integration'],
      },
      async ({ page }, testInfo) => {
        const formsPage = new FormsPage(page);
        const mainPage = new MercadoPagoWalletPage(page);
        const adminOrderPage = new AdminOrderDetailsPage(page);
        let mpWalletPopup: Page;
        let mpWalletPage: MercadoPagoWalletPage;

        await test.step('Step 1: Open popup and login to Mercado Pago', async () => {
          const popupPromise = page.waitForEvent('popup', { timeout: 20_000 });
          await formsPage.selectProcessorToOpenModal('mercadoPagoWallet');
          await mainPage.assertLabelProcessingPaymentVisible();
          mpWalletPopup = await popupPromise;

          mpWalletPage = new MercadoPagoWalletPage(mpWalletPopup);
          await mpWalletPage.assertMercadoPagoWalletIsVisible();
          await mpWalletPage.clickOnLoginWithAccount();
          await mpWalletPage.loginOrFailOnCaptcha(
            MERCADOPAGO_WALLET_CREDENTIALS.MX.payer,
            testInfo
          );
        });

        await test.step('Step 2: Select efecty payment method', async () => {
          await mpWalletPage.assertHowToPayViewVisible();
          await mpWalletPage.clickOnChooseAnotherPaymentMethod();
          await mpWalletPage.clickOnEfecty();
        });

        await test.step('Step 3: Confirm payment with BBVA and view instructionst', async () => {
          await mpWalletPage.clickOnBBVA();
          await mpWalletPage.clickOnPayOrFailOnCaptcha(testInfo);
          await mpWalletPage.assertBBVAInstructionVisible();
        });

        await test.step('Step 4: Return to commerce', async () => {
          await mpWalletPage.clickOnBackToSite();
          await mpWalletPopup.waitForEvent('close', { timeout: 20_000 });
        });

        await test.step('Step 5: Verify order status is "processing" in admin', async () => {
          await adminOrderPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderPage.assertPaymentStatus('processing');
        });
      }
    );
  }
);
