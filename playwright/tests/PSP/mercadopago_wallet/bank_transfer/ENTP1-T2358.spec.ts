import { Page, test } from '@support/fixtures';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as processorsConfig from '@support/interfaces/payment_processors';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FormsPage } from '@pages/explore/formsPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { MercadoPagoWalletPage } from '@pages/explore/forms/mercadoPagoWalletpage';
import { buildMPOrderPayload } from '../share/orderPayload';
import { configureMercadoPagoWallet } from '../share/setup';
import { mpWalletPaymentMethods } from '@pages/admin/connections/processors';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Mercado Pago Wallet - Processing BankTransfer Payment',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async () => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page, emaService }) => {
        const tokenized = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          buildMPOrderPayload() as unknown as TokenizeOrderRequestData
        );
        orderToken = tokenized.data.token;

        await configureMercadoPagoWallet(
          page,
          processorsConfig.buildMPWalletProcessor({
            exclude_payment_methods: [
              mpWalletPaymentMethods.atm,
              mpWalletPaymentMethods.debitCard,
              mpWalletPaymentMethods.creditCard,
              mpWalletPaymentMethods.ticket,
              mpWalletPaymentMethods.voucher,
              mpWalletPaymentMethods.cryptoCurrency,
              mpWalletPaymentMethods.digitalCurrency,
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

    test(
      '@ENTP1-T2358 Mercado Pago Wallet - Processing BankTransfer Payment',
      { tag: ['@team_payment_integration'] },
      async ({ page }) => {
        const formsPage = new FormsPage(page);
        const mainPage = new MercadoPagoWalletPage(page);
        const adminOrderPage = new AdminOrderDetailsPage(page);
        let mpWalletPopup: Page;
        let mpWalletPage: MercadoPagoWalletPage;

        await test.step('Step 1: Open Mercado Pago Wallet popup and select Bank Transfer', async () => {
          const popupPromise = page.waitForEvent('popup', { timeout: 20_000 });
          await formsPage.selectProcessorToOpenModal('mercadoPagoWallet');
          mpWalletPopup = await popupPromise;
          await mainPage.assertLabelProcessingPaymentVisible();

          mpWalletPage = new MercadoPagoWalletPage(mpWalletPopup);
          await mpWalletPage.assertMercadoPagoWalletIsVisible();
          await mpWalletPage.clickOnBankTransfer();
        });

        await test.step('Step 2: Confirm payment method and finalize payment', async () => {
          await mpWalletPage.assertPaymentMethodViewVisible();
          await mpWalletPage.clickOnContinueButton();
          await mpWalletPage.assertPaymentFinalize();
        });

        await test.step('Step 3: Return to commerce', async () => {
          await mpWalletPage.clickOnBackToSite();
        });

        await test.step('Step 4: Verify order status is "pending" in admin', async () => {
          await adminOrderPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderPage.assertPaymentStatus('pending');
        });
      }
    );
  }
);
