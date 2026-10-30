import { test, expect } from '@deuna/test';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { EcommercePage } from '@pages/explore/ecommercePage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutModulesForWidgetConfig } from '@support/interfaces/CheckoutConfigurationV2';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { AdminConsolidatedFlows } from '@pages/admin/adminConsolidatedFlows';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';

const configMerchant = new ConfigMerchant();

const checkout_modules: CheckoutModulesForWidgetConfig[] = [];
const amountCard1 = '3103.17';
const valueCard2 = '1,329.93';
const finalAmountCard1 = '10000';
const finalAmountCard2 = '15,433.10';
const generalWidgetConfig = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules,
    user_experience: {
      show_saved_cards_flow: true,
    },
  },
};

test.describe(
  '@regression Split Payments - Flujo sin configuración de checkout billing fields',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeAll(async () => {
      const merchant = await configMerchant.basicSetup('CO');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mercadoPagoProcessor,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'Configure merchant and then the user opens the testing page and opens the formularios page',
      async ({ page }) => {
        const adminConsolidatedFlows = new AdminConsolidatedFlows(page);
        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);
        await adminLoginPage.gotoAdmin();
        await adminHomePage.setMerchantIdSessionStorage(merchantId);
        await adminConsolidatedFlows.goToAdminAndSetMerchantId(merchantId);
        await apiCallNewman.createCampaignMCI('COP', merchantId, merchantToken);
        await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios', false, true);
        await testingTool.setUpExplore({
          orderToken: '',
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
        const ecommercePage = new EcommercePage(page);
        await ecommercePage.clickOnProduct();
        await ecommercePage.addToCart();
        await ecommercePage.clickOnIconBasket();
        await testingTool.navigateToSelectOrderType();
      }
    );

    test(
      '@ENTP1-T2314 Split Payments - Flujo sin configuración de checkout billing fields',
      {
        tag: [
          '@smoke',
          '@split_payment',
          '@admin_connection',
          '@admin-preprod',
          '@team_enterprise',
          '@preprod',
          '@checkout_ui',
        ],
      },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        await paymentPage.clickOnPayButtonEmbedded();
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Fill card 1 in card form', async () => {
          await paymentDeunaNowPage.fillCardForm(creditCardData.mercadopagoMasterCardSuccessful, {
            country: 'CO',
          });
        });

        await test.step('Fill card 2 in card form', async () => {
          await vaultWidgetPage.clickPayWithTwoCards();
          await vaultWidgetPage.adjustAmountForCard1(amountCard1);
          await vaultWidgetPage.clickContinueWithCard2();
          await paymentDeunaNowPage.fillCardForm(creditCardData.mercadopagoMasterCardSuccessfulCO, {
            country: 'CO',
          });
        });

        await test.step('Verify order information', async () => {
          await vaultWidgetPage.clickContinueWithThePaymentSummary();
          await vaultWidgetPage.assertSummaryTitle();
          await vaultWidgetPage.assertAdjustAmountForCard2(valueCard2);
        });

        await test.step('add new item to cart', async () => {
          await vaultWidgetPage.clickAddProduct();
          await vaultWidgetPage.assertAlertInfoNotification();
        });

        await test.step('fill card with new order amount', async () => {
          await vaultWidgetPage.adjustAmountForCard1(finalAmountCard1);
          await vaultWidgetPage.assertAdjustAmountForCard2(finalAmountCard2);
          await paymentPage.clickOnPayButtonSummaryWithOutTransaction();
        });

        await test.step('Verify cards created', async () => {
          const responsePromise = await vaultWidgetPage.page.waitForResponse((response) => {
            const url = response.url();
            return url.includes('/v2/users/') && url.endsWith('/cards');
          });
          expect(responsePromise.status()).toBe(201);
        });
      }
    );
  }
);
