import { Page, test, TestInfo } from '@support/fixtures';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FormsPage } from '@pages/explore/formsPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { MercadoPagoWalletPage } from '@pages/explore/forms/mercadoPagoWalletpage';
import { getMPCreditCard } from '@support/interfaces/credit_cards';
import { MPOrderPayload } from '../share/orderPayload';
import { configureMercadoPagoWallet } from '../share/setup';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { mpWalletPaymentMethods } from '@pages/admin/connections/processors';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Mercado Pago Wallet - Failed Credit Card Payment & Processing DEUNA Payment status',
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
              mpWalletPaymentMethods.atm,
              mpWalletPaymentMethods.bankTransfer,
              mpWalletPaymentMethods.debitCard,
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
      '@ENTP1-T2345 Mercado Pago Wallet - Failed Credit Card Payment & Processing DEUNA Payment status',
      { tag: ['@team_payment_integration'] },
      async ({ page }, testInfo: TestInfo) => {
        const formsPage = new FormsPage(page);
        const mainPage = new MercadoPagoWalletPage(page);

        const adminOrderPage = new AdminOrderDetailsPage(page);

        let mpWalletPopup: Page;
        let mpWalletPage: MercadoPagoWalletPage;

        await test.step('Step 1: Open popup and select credit card', async () => {
          const popupPromise = page.waitForEvent('popup', { timeout: 60_000 });

          await formsPage.selectProcessorToOpenModal('mercadoPagoWallet');
          await mainPage.assertLabelProcessingPaymentVisible();
          mpWalletPopup = await popupPromise;

          mpWalletPage = new MercadoPagoWalletPage(mpWalletPopup);
          await mpWalletPage.assertMercadoPagoWalletIsVisible();

          // Wait for the intermediate "Procesando pago..." screen to disappear
          // before attempting to select payment method
          await mpWalletPage.waitForProcessingToComplete();

          await mpWalletPage.clickOnCreditCard();
          await mpWalletPage.assertLabelCardFormVisible();
        });

        await test.step('Step 2: Fill card details and handle installments', async () => {
          await mpWalletPage.fillCard(getMPCreditCard({ holder: 'OTHE' }));
          await mpWalletPage.clickOnContinueButton();

          await mpWalletPage.clickOnOneInstallmentOption();
          await mpWalletPage.assertPaymentMethodViewVisible();
        });

        await test.step('Step 3: Finalize payment and handle popup closure', async () => {
          await mpWalletPage.clickOnPayOrFailOnCaptcha(testInfo);

          const result = await mpWalletPage.handlePostPaymentFlow();

          // A provider block is a failure, not a skip: skipping published the
          // case as Not Executed and kept it out of the retry rounds and the
          // ai-heal CSV.
          if (result === 'CAPTCHA_TRIGGERED' || result === 'MP_INTERNAL_ERROR') {
            throw new Error(`External Provider issue: ${result}`);
          }

          const popupClosed = mpWalletPopup.waitForEvent('close', { timeout: 40_000 });
          await mpWalletPage.clickOnBackToSite();
          await popupClosed;
        });

        await test.step('Step 4: Verify order status is pending', async () => {
          await adminOrderPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderPage.assertOrderStatus('pending');
          await adminOrderPage.assertPaymentStatus('denied');
        });
      }
    );
  }
);
