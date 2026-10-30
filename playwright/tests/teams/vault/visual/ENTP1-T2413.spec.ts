import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { CheckoutModulesForWidgetConfig } from '@support/interfaces/CheckoutConfigurationV2';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { verifyElementVisualConsistency } from '@visual/utils/visualTestingUtils';
import { viewports } from '@visual/utils/viewports';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
const checkout_modules: CheckoutModulesForWidgetConfig[] = [
  {
    name: 'BillingPattern',
    props: {
      fields: [
        {
          name: 'first_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'last_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'address1',
          validation: {
            required: true,
          },
        },
      ],
      show_in_main_view: false,
    },
  },
];
const generalWidgetConfig = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules,
    user_experience: {
      show_saved_cards_flow: false,
    },
  },
  elementsConfig: {
    init_with_guest_user: true,
    user_authentication_flow: false,
  },
};

test.describe(
  '@regression @visual Test de Regresión Visual de Split Payments (Flujo Happy Path)',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('MX');
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
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: userEmail,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test.beforeEach(
      'The user opens the testing page and opens the formularios page',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios', true, true);
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          withSplitPayment: true,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2413 Elements: Test de Regresión Visual de Split Payments (Flujo Happy Path)',
      { tag: ['@visual', '@split_payment'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        await paymentPage.clickOnPayButtonEmbedded();
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        const amountCard1 = '1000';
        const amountCard1Summary = '1250';

        await test.step('Fill card 1 in card form', async () => {
          await paymentDeunaNowPage.fillCardForm(creditCardData.mercadoPagoVisaCardSuccessful, {
            country: 'MX',
          });
        });

        await verifyElementVisualConsistency(
          vaultWidgetPage.page,
          'vault_embed_container',
          [viewports.desktop],
          'step-1-single-payment-with-data-filled',
          {
            frameLocators: [paymentDeunaNowPage.iframeZoidVisible],
            skipHeightNormalization: true,
            useClipCapture: true,
          }
        );

        await test.step('User clicks on Pay with two cards and modify card 1 amount', async () => {
          await vaultWidgetPage.clickPayWithTwoCards();
          await vaultWidgetPage.adjustAmountForCard1(amountCard1);
        });

        await verifyElementVisualConsistency(
          vaultWidgetPage.page,
          'vault_embed_container',
          [viewports.desktop],
          'step-1-split-payment-with-card-data-1-filled',
          {
            frameLocators: [paymentDeunaNowPage.iframeZoidVisible],
            skipHeightNormalization: true,
            useClipCapture: true,
          }
        );

        await test.step('User go to second step and fills card 2 data', async () => {
          await vaultWidgetPage.clickContinueWithCard2();
          await vaultWidgetPage.fillCardForm(creditCardData.mercadoPagoVisaCardSuccessful, {
            country: 'MX',
          });
        });

        await verifyElementVisualConsistency(
          vaultWidgetPage.page,
          'vault_embed_container',
          [viewports.desktop],
          'step-2-split-payment-with-card-data-2-filled',
          {
            frameLocators: [paymentDeunaNowPage.iframeZoidVisible],
            skipHeightNormalization: true,
            useClipCapture: true,
          }
        );

        await test.step('Verify order information', async () => {
          await vaultWidgetPage.clickContinueWithThePaymentSummary();
          await vaultWidgetPage.assertSummaryTitle();
          await vaultWidgetPage.adjustAmountForCard1(amountCard1Summary);
          await vaultWidgetPage.clickSummaryTitle();
        });

        await verifyElementVisualConsistency(
          vaultWidgetPage.page,
          'vault_embed_container',
          [viewports.desktop],
          'step-summary-split-payment-with-summary',
          {
            frameLocators: [paymentDeunaNowPage.iframeZoidVisible],
            skipHeightNormalization: true,
            useClipCapture: true,
          }
        );
      }
    );
  }
);
