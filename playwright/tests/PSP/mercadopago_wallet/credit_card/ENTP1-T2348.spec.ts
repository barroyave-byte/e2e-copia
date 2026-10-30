import { Page, test } from '@support/fixtures';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import * as processorsConfig from '@support/interfaces/payment_processors';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FormsPage } from '@pages/explore/formsPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { MercadoPagoWalletPage } from '@pages/explore/forms/mercadoPagoWalletpage';
import { getMPCreditCard, MPWalletVisaDebitCardSuccessful } from '@support/interfaces/credit_cards';
import { MPOrderPayload } from '../share/orderPayload';
import { configureMercadoPagoWallet } from '../share/setup';
import { mpWalletPaymentMethods } from '@pages/admin/connections/processors';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Mercado Pago Wallet - Retry with Debit Card after Credit Card fails',
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
      '@ENTP1-T2348 Mercado Pago Wallet - Retry with Debit Card after Credit Card fails',
      {
        annotation: { type: 'bug', description: 'ENTP1-15996' },
        tag: ['@team_payment_integration'],
      },
      async ({ page }, testInfo) => {
        const formsPage = new FormsPage(page);
        const mainPage = new MercadoPagoWalletPage(page);

        const adminOrderPage = new AdminOrderDetailsPage(page);

        let mpWalletPopup: Page;
        let mpWalletPage: MercadoPagoWalletPage;

        await test.step('Step 1: Open Mercado Pago Wallet and select credit card', async () => {
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

        await test.step('Step 2: Attempt payment with a denied credit card', async () => {
          await mpWalletPage.fillCard(getMPCreditCard({ holder: 'OTHE' }));
          await mpWalletPage.clickOnContinueButton();
          await mpWalletPage.clickOnOneInstallmentOption();
          await mpWalletPage.assertPaymentMethodViewVisible();
          await mpWalletPage.clickOnPayOrFailOnCaptcha(testInfo);
          await mpWalletPage.assertPaymentFailed();
        });

        await test.step('Step 3: Change payment method to a valid debit card', async () => {
          await mpWalletPage.clickOnChangePaymentMethod();
          await mpWalletPage.assertMercadoPagoWalletIsVisible();
          await mpWalletPage.clickOnDebitCard();
          await mpWalletPage.assertLabelCardFormVisible();
          await mpWalletPage.fillCard(MPWalletVisaDebitCardSuccessful);
          await mpWalletPage.clickOnContinueUntilPaymentReview();
        });

        await test.step('Step 4: Finalize payment and handle popup closure', async () => {
          await mpWalletPage.clickOnPayOrFailOnCaptcha(testInfo);
          await mpWalletPage.assertPaymentSuccessful();
          await mpWalletPopup.waitForEvent('close', { timeout: 20_000 });
        });

        await test.step('Step 5: Verify order status is processed', async () => {
          await adminOrderPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
