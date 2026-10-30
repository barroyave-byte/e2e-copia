import type { TokenizeOrderRequestData } from '@support/http/models/order';
import { Page, test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';

import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { GuestUserDataPage } from '@pages/payment_link/user_data/guestUserDataPage';
import * as userData from '@support/interfaces/user_data';
import { defaultCheckoutModulesWithoutLogin } from '@support/utils/checkoutModules';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { configureMercadoPagoWallet } from '../share/setup';
import { mpWalletPaymentMethods } from '@pages/admin/connections/processors';
import { buildMPOrderAsLinkPayload } from '../share/orderPayload';
import { MercadoPagoWalletPage } from '@pages/explore/forms/mercadoPagoWalletpage';

const configMerchantCheckout = new ConfigMerchantCheckout();

declare const window: Window & { disablePolling: any };

test.describe(
  '@regression [PaymentLink] MercadoPago Wallet - Processing BankTransfer payment',
  { tag: ['@checkout', '@checkout_base', '@payment_link'] },
  () => {
    let orderToken: string;
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async () => {
      const merchant = await configMerchantCheckout.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page, emaService }) => {
        const tokenized = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          buildMPOrderAsLinkPayload() as unknown as TokenizeOrderRequestData
        );
        orderToken = tokenized.data.token;

        await apiCallNewman.createCheckoutModulesConfig(
          defaultCheckoutModulesWithoutLogin,
          merchantId,
          merchantToken
        );
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

        await page.context().addInitScript(() => {
          window.disablePolling = true;
        });

        const testingTool = nagivateAndConfigureWidget(page, 'Payment Link');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2361 [PaymentLink] MercadoPago Wallet - Processing BankTransfer payment',
      { tag: ['@admin_connection', '@admin-preprod', '@team_payment_integration'] },
      async ({ page }) => {
        const paymentLinkPage = await page.waitForEvent('popup');
        const paymentPage = new PaymentPage(paymentLinkPage);
        const guestUserPage = new GuestUserDataPage(paymentLinkPage);
        const adminOrderPage = new AdminOrderDetailsPage(page);
        let mpWalletPopup: Page;
        let mpWalletPage: MercadoPagoWalletPage;

        await test.step('Step 1: Select payment method and fill user information', async () => {
          await paymentPage.clickTabMercadoPagoWallet();
          await guestUserPage.enterGuestUserData(userData.userDataMX);
          await paymentPage.enterBillingZipCode();
        });

        await test.step('Step 2: Initiate payment and open Mercado Pago popup', async () => {
          const popupPromise = paymentLinkPage.waitForEvent('popup', { timeout: 20_000 });
          await paymentPage.clickOnPayWaitResponse();
          mpWalletPopup = await popupPromise;
          await paymentPage.assertOrderStatusRequestPurchase('pending', 200);
          mpWalletPage = new MercadoPagoWalletPage(mpWalletPopup);
          await mpWalletPage.assertMercadoPagoWalletIsVisible();
        });

        await test.step('Step 3: Select bank transfer payment method', async () => {
          await mpWalletPage.clickOnBankTransfer();
          await mpWalletPage.assertPaymentMethodViewVisible();
        });

        await test.step('Step 4: Confirm payment method and finalize payment', async () => {
          await mpWalletPage.clickOnContinueButton();
          await mpWalletPage.assertPaymentFinalize();
        });

        await test.step('Step 5: Return to commerce', async () => {
          await mpWalletPage.clickOnBackToSite();
        });

        await test.step('Step 6: Verify order status is "pending" in admin', async () => {
          await adminOrderPage.goToOrderDetails(merchantId, orderToken);
          await adminOrderPage.assertPaymentStatus('pending');
        });
      }
    );
  }
);
