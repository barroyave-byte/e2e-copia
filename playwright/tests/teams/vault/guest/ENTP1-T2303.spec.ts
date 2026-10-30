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
const amountCard1 = '1500';
const amountCard2 = '1700';
const totalAmount = 443310;
const totalAmountWithInstallments = 147770;
const halfTotalAmount = 221655;
const halfTotalAmountWithInstallments = 73885;
const totalAmountCard1 = 150000;
const totalAmountCard2 = 170000;
const amountCard1WithInstallments = 50000;
const amountCard2WithInstallments = 56667;
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
  '@regression Flujo Split Payments - Usuario nuevo compra con cuotas de pago correctas asociadas al monto dividido',
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
      await apiCallNewman.createCampaignMSI('COP', merchantId, merchantToken);
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test.beforeEach(
      'The user opens the testing page and opens the formularios page',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Formularios', false, true);
        await testingTool.setUpExplore({
          orderToken: '',
          merchantCredentials: { publicKey, privateKey },
        });
        const ecommercePage = new EcommercePage(page);
        await ecommercePage.clickOnProduct();
        await ecommercePage.addToCart();
        await ecommercePage.clickOnIconBasket();
        await testingTool.navigateToSelectOrderType();
      }
    );

    test(
      '@ENTP1-T2303 Flujo Split Payments - Usuario nuevo compra con cuotas de pago correctas asociadas al monto dividido',
      {
        tag: [
          '@smoke',
          '@split_payment',
          '@flaky',
          '@team_enterprise',
          '@fixme_preprod',
          '@checkout_ui',
        ],
      },
      async ({ page }) => {
        const paymentPage = new PaymentPage(page);
        await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
        await paymentPage.clickOnPayButtonEmbedded();
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        const expectedFirstBin = creditCardData.mercadoPagoVisaCardSuccessful.number
          .slice(0, 8)
          .toString();
        const expectedSecondBin = creditCardData.mercadoPagoVisaCardSuccessful.number
          .slice(0, 8)
          .toString();

        await test.step('User sees correct installments in Single Payment flow', async () => {
          vaultWidgetPage.waitForInstallmentsResponse(expectedFirstBin);
          await vaultWidgetPage.fillFormVault(creditCardData.mercadoPagoVisaCardSuccessful, {
            avoidInstallmentsCall: true,
            country: 'CO',
          });
          await vaultWidgetPage.assertInstallmentsData(3, totalAmount, totalAmountWithInstallments);
        });

        await test.step('Fill Billing form', async () => {
          await paymentDeunaNowPage.assertBillingButtonAnyTypeIsVisibleToClick();
          await vaultWidgetPage.fillBillingForm('Bogotá D.C.', 'Bogotá D.C.');
          await paymentDeunaNowPage.clickToSaveFormButton();
        });

        await test.step('User goes to Split Payments and Installments are recalculated', async () => {
          vaultWidgetPage.waitForInstallmentsResponse(expectedFirstBin);
          await vaultWidgetPage.clickPayWithTwoCards();
          console.log(totalAmount / 2, 'check_installments_1');
          await vaultWidgetPage.assertInstallmentsData(
            3,
            halfTotalAmount,
            halfTotalAmountWithInstallments
          );
        });

        await test.step('User select MSI', async () => {
          await vaultWidgetPage.selectInstallmentsMSI('3');
        });

        await test.step('User adjust amount for card 1', async () => {
          vaultWidgetPage.waitForInstallmentsResponse(
            expectedFirstBin,
            (parseInt(amountCard1) * 100).toString()
          );
          await vaultWidgetPage.adjustCardAmount(1, amountCard1);

          await page.locator('body').click();
          console.log(parseInt(amountCard1) * 100, 'check_installments_1');
          await vaultWidgetPage.assertInstallmentsData(
            3,
            totalAmountCard1,
            amountCard1WithInstallments
          );
        });
        await test.step('User select MSI', async () => {
          await vaultWidgetPage.selectInstallmentsMSI('3');
        });

        await test.step('Fill card 2 in card form', async () => {
          await vaultWidgetPage.clickContinueWithCard2();
          await paymentDeunaNowPage.fillCardForm(creditCardData.mercadoPagoVisaCardSuccessful, {
            country: 'CO',
          });
        });

        await test.step('Verify order information', async () => {
          await vaultWidgetPage.clickContinueWithThePaymentSummary();
          await vaultWidgetPage.assertSummaryTitle();
          vaultWidgetPage.waitForInstallmentsResponse(
            expectedSecondBin,
            (parseInt(amountCard2) * 100).toString()
          );
          await vaultWidgetPage.adjustCardAmount(2, amountCard2);

          await page.locator('body').click();
          console.log(parseInt(amountCard2) * 100, 'check_installments_1');
          await vaultWidgetPage.assertInstallmentsData(
            3,
            totalAmountCard2,
            amountCard2WithInstallments
          );
          await paymentPage.clickOnPayButtonSummaryWithOutTransaction();
        });

        await test.step('Verify cards created', async () => {
          await vaultWidgetPage.assertCardsCreated();
        });
      }
    );
  }
);
