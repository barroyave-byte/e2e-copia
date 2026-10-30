import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';
import { THEME_FULL_CONFIG } from '@support/http/testData/checkout_configuration/CheckoutThemeConfig';

const globalAssert = new GlobalAssert();
const configMerchantVault = new ConfigMerchant();

test.describe(
  '@regression Compra exitosa con cssFile como parametro al levantar Vault Widget',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let themeData;
    const themeName = 'CustomStyleE2E';

    let merchantId: string;
    let merchantToken: string;

    let merchantName: string;

    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    let orderId: string;

    test.beforeAll(async ({ emaService, checkoutConfigurationService }) => {
      const merchant = await configMerchantVault.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken);

      const response = await checkoutConfigurationService.createTheme(
        privateKey,
        themeName,
        THEME_FULL_CONFIG
      );
      themeData = response.data as any;

      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.stripeProcessor,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'User opens the testing page and accesses the required widget',
      async ({ page }) => {
        // Open the testing page and navigate to the widget to be tested
        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          customStyle: {
            cssFile: themeData.id,
          },
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2027 Compra Exitosa con CSSFile como parametro al levantar Vault Widget',
      { tag: ['@smoke', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Fill out the credit card form and save', async () => {
          await vaultWidgetPage.fillFormVault(creditCardData.stripeVisaSuccessful, {
            country: 'MX',
          });

          await vaultWidgetPage.assertButtonEnabled();
        });

        await test.step('Valid CSSFile and Custom Style data', async () => {
          const cssFile = (await vaultWidgetPage.getFrameURL()).searchParams.get('cssFile');
          expect(cssFile).toBe(themeData.id);
          expect(themeName).toBe(themeData.name);

          await vaultWidgetPage.assertElementVisibleInIframe(
            page.getByRole('heading', {
              name: themeData.config.PaymentMethodsPattern.translations.es.paymentMethods.info.card
                .title,
            })
          );
          await vaultWidgetPage.assertElementVisibleInIframe(
            page.getByText(themeData.config.UpperTagPattern.title)
          );
          await vaultWidgetPage.assertElementVisibleInIframe(
            page.getByText(themeData.config.UpperTagPattern.description).first()
          );
        });

        await test.step('User selects Pay', async () => {
          await vaultWidgetPage.clickOnPay();
        });

        await test.step('Validate card and purchase V2 request is sent', async () => {
          // Validate that the request /cards sent from the UI is correct.
          const cardId = await vaultWidgetPage.assertCardRequest();
          // Validate that the request v2/purchase sent from the UI is correct.
          await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('processed', 200, cardId);
          await page.waitForTimeout(1000);
          // Validate that when doing a get order, the status is correct.
          await globalAssert.assertTransactionPaymentStatus('processed', privateKey, orderToken);
        });
      }
    );
  }
);
