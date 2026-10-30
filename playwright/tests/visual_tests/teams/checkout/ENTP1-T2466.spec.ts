import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { newElementsConfig, widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { AdminHomePage } from '@pages/admin/adminHomePage';
import { AdminLoginPage } from '@pages/admin/adminLoginPage';
import { CheckoutModulesForWidgetConfig } from '@support/interfaces/CheckoutConfigurationV2';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { verifyElementVisualConsistency } from '@visual/utils/visualTestingUtils';
import { randomUUID } from 'crypto';
import { splitPaymentCustomStyleTranslationsEs } from '@support/mocks/splitPaymentsCustomStylesTranslationsEs';
import { EmailGenerator } from '@support/utils/EmailGenerator';

const configMerchant = new ConfigMerchant();

const userEmail = EmailGenerator.generateRegisteredUserEmail();
const amountCard1 = '100';
const checkout_modules: CheckoutModulesForWidgetConfig[] = [
  {
    name: 'BillingPattern',
    props: {
      fields: [
        {
          name: 'address1',
          validation: {
            required: true,
          },
        },
        {
          name: 'state_name',
          validation: {
            required: true,
          },
        },
        {
          name: 'city',
          validation: {
            required: true,
          },
        },
      ],
      show_in_main_view: false,
    },
  },
];
const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    checkout_modules,
  },
  elementsConfig: {
    ...newElementsConfig,
    theme_config: [
      {
        id: randomUUID(),
        name: 'new_theme_config',
        config: JSON.stringify(splitPaymentCustomStyleTranslationsEs),
      },
    ],
  },
};

test.describe(
  '@regression @visual Custom styles - Validar textos en español - Guest - Split Payment',
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
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey, {
        user_email: userEmail,
        amount: 250000,
      });
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;

      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test(
      '@ENTP1-T2466 Custom styles - Validar textos en español - Guest - Split Payment',
      { tag: ['@team_enterprise', '@split_payment', '@visual'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        const adminHomePage = new AdminHomePage(page);
        const adminLoginPage = new AdminLoginPage(page);

        await test.step('The user opens the admin page and set merchant id session', async () => {
          await adminLoginPage.gotoAdmin();
          await adminHomePage.setMerchantIdSessionStorage(merchantId);
        });

        await test.step('The user goes to connections', async () => {
          await adminHomePage.goToConnections();
        });

        await test.step('The user navigates to the payment screen as guest user', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios', true, true);
          await testingTool.navigateAndSetup({
            orderToken: orderToken,
            withSplitPayment: true,
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
        });

        await test.step('Select payment method', async () => {
          await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
          await paymentPage.clickOnPayButtonEmbedded();
          // Hide Explore footer
          await page.evaluate(() => {
            const element = document.getElementById('footer');
            if (element) {
              element.style.display = 'none';
            }
          });
        });

        await test.step('Fill Billing form', async () => {
          await vaultWidgetPage.expectLoaderIsNotVisible();
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
          await vaultWidgetPage.fillBillingForm('Aguascalientes', 'Aguascalientes');
          await paymentDeunaNowPage.clickToSaveFormButton();
        });

        await test.step('Go to split payment', async () => {
          await vaultWidgetPage.clickPayWithTwoCards();
          await vaultWidgetPage.assertSplitPaymentFormIsVisible();
          await vaultWidgetPage.expectLogoCardIconIsVisible();
        });

        await verifyElementVisualConsistency(
          paymentDeunaNowPage.page,
          'vault_embed_container',
          [
            {
              label: 'desktop',
              width: 1520,
              height: 1080,
            },
          ],
          'validate-split-payment-first-card',
          {
            maskLocators: [vaultWidgetPage.stepperSplitPaymentProgressBar],
          }
        );

        await test.step('Fill first card amount & card form', async () => {
          await vaultWidgetPage.assertCustomStyleTextIsVisible(
            splitPaymentCustomStyleTranslationsEs.SplitPaymentPage.translations.es.stepper
              .backToSinglePayment
          );
          await vaultWidgetPage.adjustAmountForCard1(amountCard1);
          await vaultWidgetPage.fillCardForm(creditCardData.mercadoPagoVisaCardSuccessful, {
            avoidInstallmentsCall: true,
            delayInMs: 500,
            country: 'MX',
          });
          await vaultWidgetPage.clickContinueWithCard2();
          await vaultWidgetPage.expectLogoCardIconIsVisible();
        });

        await verifyElementVisualConsistency(
          paymentDeunaNowPage.page,
          'vault_embed_container',
          [
            {
              label: 'desktop',
              width: 1520,
              height: 1080,
            },
          ],
          'validate-split-payment-second-card',
          {
            maskLocators: [
              vaultWidgetPage.stepperSplitPaymentProgressBar,
              vaultWidgetPage.labelSplitPaymentCardDetails,
            ],
          }
        );

        await test.step('Fill second card amount', async () => {
          await vaultWidgetPage.fillCardForm(creditCardData.mercadoPagoVisaFraud, {
            avoidInstallmentsCall: true,
            delayInMs: 500,
            country: 'MX',
          });
          await vaultWidgetPage.clickContinueWithThePaymentSummary();
        });

        await verifyElementVisualConsistency(
          paymentDeunaNowPage.page,
          'vault_embed_container',
          [
            {
              label: 'desktop',
              width: 1520,
              height: 1080,
            },
          ],
          'validate-split-payment-summary',
          {
            maskLocators: [
              vaultWidgetPage.stepperSplitPaymentProgressBar,
              vaultWidgetPage.labelSplitPaymentSummaryCard1,
              vaultWidgetPage.labelSplitPaymentSummaryCard2,
            ],
          }
        );
      }
    );
  }
);
