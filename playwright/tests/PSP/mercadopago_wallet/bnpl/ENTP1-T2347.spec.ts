import { Page, test } from '@support/fixtures';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { FormsPage } from '@pages/explore/formsPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { MercadoPagoWalletPage } from '@pages/explore/forms/mercadoPagoWalletpage';
import { MPOrderPayload } from '../share/orderPayload';
import { MERCADOPAGO_WALLET_CREDENTIALS } from '../share/credentials';
import { configureMercadoPagoWallet } from '../share/setup';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { mpWalletPaymentMethods } from '@pages/admin/connections/processors';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe(
  '@regression Mercado Pago Wallet - Successful BNPL Payment',
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
              mpWalletPaymentMethods.creditCard,
              mpWalletPaymentMethods.ticket,
              mpWalletPaymentMethods.voucher,
              mpWalletPaymentMethods.cryptoCurrency,
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
      '@ENTP1-T2347 Mercado Pago Wallet - Successful BNPL Payment',
      { annotation: { type: 'bug', description: 'PF-3774' }, tag: ['@team_payment_integration'] },
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
            MERCADOPAGO_WALLET_CREDENTIALS.MX.payerWithCredit,
            testInfo
          );

          await mpWalletPage.assertHowToPayViewVisible();
        });

        await test.step('Step 2: Select BNPL payment with installments', async () => {
          await mpWalletPage.clickOnBNPL();
          await mpWalletPage.clickOnInstallments();
          await mpWalletPage.clickOnOption3Installments();
        });

        await test.step('Step 3: Finalize payment and handle popup closure', async () => {
          await mpWalletPage.clickOnPayOrFailOnCaptcha(testInfo);
          if (await mpWalletPage.isContainerEnterCodeVisible()) {
            await page.waitForTimeout(5000);
            await mpWalletPage.enterCode(MERCADOPAGO_WALLET_CREDENTIALS.MX.payerWithCredit.code);
            await mpWalletPage.clickOnSubmitButton();
          }
          await mpWalletPage.assertPaymentSuccessful();

          await mpWalletPopup.waitForEvent('close', { timeout: 30_000 });
        });

        await test.step('Step 4: Verify order status is processed', async () => {
          await adminOrderPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderPage.assertPaymentStatus('processed');
        });
      }
    );
  }
);
