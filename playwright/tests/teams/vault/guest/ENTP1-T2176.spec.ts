import { test } from '@support/fixtures';
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

const configMerchant = new ConfigMerchant();

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
  '@regression Flujo Split Payments - Usuarios Nuevos y Guest',
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
      await apiCallNewman.createCampaignMCI('COP', merchantId, merchantToken);
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test.beforeEach(
      'The user opens the testing page and opens the formularios page',
      async ({ page }) => {
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
      '@ENTP1-T2176 Flujo Split Payments - Usuarios Nuevos y Guest',
      { tag: ['@smoke', '@split_payment', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        await paymentPage.clickOnPayButtonEmbedded();
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Fill card 1 in card form', async () => {
          await paymentDeunaNowPage.fillCardForm(creditCardData.mercadopagoMasterCardSuccessfulMX, {
            country: 'CO',
          });
        });

        await test.step('Fill Billing form', async () => {
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
          await vaultWidgetPage.fillBillingForm('Bogotá D.C.', 'Bogotá D.C.');
          await paymentDeunaNowPage.clickToSaveFormButton();
        });

        await test.step('Fill card 2 in card form', async () => {
          await vaultWidgetPage.clickPayWithTwoCards();
          await vaultWidgetPage.adjustAmountForCard1(amountCard1);
          await paymentDeunaNowPage.selectInstallmentsMCI('3');
          await vaultWidgetPage.clickContinueWithCard2();
          await paymentDeunaNowPage.fillCardForm(creditCardData.mercadopagoMasterCardSuccessful, {
            country: 'CO',
          });
        });

        await test.step('Verify order information and validate vaultSaveSuccess metadata', async () => {
          await vaultWidgetPage.clickContinueWithThePaymentSummary();
          await vaultWidgetPage.assertSummaryTitle();
          await vaultWidgetPage.assertAdjustAmountForCard2(valueCard2);
          await vaultWidgetPage.clickAddProduct();
          await vaultWidgetPage.assertAlertInfoNotification();
          await page.waitForTimeout(1000);
          await vaultWidgetPage.adjustAmountForCard1(finalAmountCard1);
          await vaultWidgetPage.clickSummaryTitle();
          await vaultWidgetPage.assertAdjustAmountForCard2(finalAmountCard2);

          const cardsApiPromise = vaultWidgetPage.captureCardsApiResponse();
          const metadataPromise = vaultWidgetPage.assertEventMetadata('vaultSaveSuccess', {
            timeout: 40000,
          });
          await paymentPage.clickOnPayButtonSummaryWithOutTransaction();
          const [metadata, cardsApiResponse] = await Promise.all([
            metadataPromise,
            cardsApiPromise,
          ]);

          // Amounts are dynamic (clickAddProduct changes the total mid-flow),
          // so we validate card identity + billing but not exact amounts.
          vaultWidgetPage.assertVaultSaveSuccessCards(
            metadata,
            [
              {
                firstSix: '547492',
                lastFour: '0366',
                cardHolder: creditCardData.mercadopagoMasterCardSuccessfulMX.cardholder_name,
                storedCard: false,
                billingCountry: 'CO',
                billingCity: 'Bogotá D.C.',
                billingStateName: 'Bogotá D.C.',
              },
              {
                firstSix: '503175',
                lastFour: '0604',
                cardHolder: creditCardData.mercadopagoMasterCardSuccessful.cardholder_name,
                storedCard: false,
                billingCountry: 'CO',
                billingCity: 'Bogotá D.C.',
                billingStateName: 'Bogotá D.C.',
              },
            ],
            { cardsApiResponse }
          );
        });
      }
    );
  }
);
