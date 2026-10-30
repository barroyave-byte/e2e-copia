import { expect, test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import ConfigAuth from '@support/api_sup/config_merchant_sup/configAuth';
import * as userAddressCreditCard from '@support/interfaces/address_user';
import { verifyElementVisualConsistency } from '@visual/utils/visualTestingUtils';
import { commonViewportSets } from '@visual/utils/viewports';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();
const configAuth = new ConfigAuth();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules: [],
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
  elementsConfig: {
    ...newElementsConfig,
    init_with_guest_user: false,
    user_authentication_flow: true,
  },
};

test.describe(
  '@regression @visual Flujo Split Payments -  Usuario autenticado compra con cuotas de pago correctas asociadas al monto dividido',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let userToken: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService, userAuthService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: userEmail,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      // Register user and set address
      await userAuthService.registerUserAndSetAddress(
        {
          email: userEmail,
          phone: userAddressCreditCard.userAddressCreditCardMX.phone,
          identity_document: creditCardData.mercadoPagoVisaCardSuccessful.document_number,
        },
        {
          merchantId,
          merchantPrivateKey: privateKey,
        }
      );

      await apiCallNewman.setCreditCardForUser(
        userEmail,
        creditCardData.mercadoPagoVisaCardSuccessful,
        userAddressCreditCard.userAddressCreditCardMX,
        merchantId,
        privateKey
      );

      userToken = await configAuth.setUserToken(userEmail, merchantId, privateKey);
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessor,
        merchantId,
        merchantToken
      );
    });

    test(
      '@ENTP1-T2334 Split Payments - Datos de facturación no visible - checkout_modules sin BillingPattern',
      {
        tag: [
          '@smoke',
          '@split_payment',
          '@visual',
          '@admin_connection',
          '@admin-preprod',
          '@team_enterprise',
          '@preprod',
          '@checkout_ui',
          '@vault_external_button',
        ],
      },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        const adminHomePage = new AdminHomePage(page, 'ES');
        const adminLoginPage = new AdminLoginPage(page);

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user navigates to the payment screen as guest user', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios', true, true);
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            withSplitPayment: true,
            userToken,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Select payment method', async () => {
          await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
          await paymentPage.clickOnPayButtonEmbedded();
        });

        await test.step('Go to split payments form', async () => {
          await vaultWidgetPage.goToSplitPaymentsForm();
        });

        await test.step('User goes to Split Payments and Installments are recalculated', async () => {
          await vaultWidgetPage.assertBillingButtonAnyTypeIsNotVisible();
          await expect(vaultWidgetPage.inputAdjustAmountCard1).toBeVisible({ timeout: 30_000 });
          await expect(vaultWidgetPage.inputAdjustAmountCard2).toBeVisible({ timeout: 30_000 });
          // The "Total a pagar" row renders below both card amount fields — waiting for
          // it too (not just the fields) avoids capturing the screenshot mid-layout-shift.
          await expect(vaultWidgetPage.inputTotalToPay).toBeVisible();
          await expect(
            vaultWidgetPage.iframeVault.getByRole('button', { name: 'Continuar con la segunda' })
          ).toBeVisible({ timeout: 30_000 });
        });

        // The stepper's active-step fill (.stepper-line-fill--active) animates its
        // width continuously, so `expect(iframeBody).toHaveScreenshot()` never sees
        // two stable frames and times out on "waiting for element to be stable"
        // before it can even take the screenshot — `mask` runs after that check, so
        // it can't rescue it. Other split-payment visual specs (e.g. ENTP1-T2373,
        // ENTP1-T2380) work around this the same way: capture the host page's
        // #vault_embed_container with useClipCapture, which takes a clipped
        // page.screenshot() instead of relying on Playwright's element-stability
        // wait, and mask the progress bar for pixel comparison only.
        await verifyElementVisualConsistency(
          page,
          'vault_embed_container',
          commonViewportSets.desktopAndFullscreen,
          'step-verify-billing-summary-visible',
          {
            maskLocators: [vaultWidgetPage.stepperSplitPaymentProgressBar],
            frameLocators: [vaultWidgetPage.iframeVault],
            useClipCapture: true,
          }
        );
      }
    );
  }
);
