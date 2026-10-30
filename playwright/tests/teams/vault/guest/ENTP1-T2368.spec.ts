import { test } from '@deuna/test';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';

const generalWidgetConfig: apiCallNewman.ConfigurationV2 = {
  widgets_general_config: {
    ...widgetsGeneralConfig,
    currencies: {
      minor_units: [
        {
          currency: 'MXN',
          decimals: 0,
        },
      ],
    },
  },
};

test.describe(
  '@regression Split Payment - Payment Vault (Web SDK External Button)',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    test.beforeEach('Should configure merchant', async () => {
      const configMerchant = new ConfigMerchant();
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.mitProcessor,
        merchantId,
        merchantToken
      );
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, generalWidgetConfig);
    });

    test(
      '@ENTP1-T2368 Configure minor units for amounts based on currencies',
      { tag: ['@smoke', '@review_action', '@team_enterprise', '@preprod', '@checkout_ui'] },
      async ({ page }) => {
        const ecommercePage = new EcommercePage(page);
        const paymentPage = new PaymentPage(page);
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Should open the testing page and navigate to the required experience', async () => {
          const testingTool = nagivateAndConfigureWidget(page, 'Formularios', false, true);
          await testingTool.setUpExplore({
            orderToken: '',
            merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
          });
          await ecommercePage.clickOnProduct();
          await ecommercePage.addToCart();
          await ecommercePage.clickOnIconBasket();
          await testingTool.navigateToSelectOrderType();
        });

        await test.step('Should select payment method and click on pay button', async () => {
          await paymentPage.selectPaymentMethod('Payment Vault (Web SDK External Button)');
          await paymentPage.clickOnPayButtonEmbedded();
        });

        await test.step('Should click on Pay with two cards', async () => {
          await vaultWidgetPage.clickPayWithTwoCards();
        });

        await test.step('Should verify minor units', async () => {
          const CONFIGURED_MXN_DECIMALS =
            generalWidgetConfig.widgets_general_config.currencies.minor_units[0].decimals;
          await vaultWidgetPage.assertMinorUnits(CONFIGURED_MXN_DECIMALS);
        });

        await test.step('Should verify card 1 error amount', async () => {
          await vaultWidgetPage.adjustAmountForCard1('10.67');
          await vaultWidgetPage.clickOnTotalToPay();
          await vaultWidgetPage.assertCard1AmountError();
        });

        await test.step('Should verify card 1 correct amount', async () => {
          await vaultWidgetPage.adjustAmountForCard1('11');
          await vaultWidgetPage.clickOnTotalToPay();
          await vaultWidgetPage.assertCard1AmountErrorHidden();
          await vaultWidgetPage.assertAdjustAmountForCard1('11');
        });
      }
    );
  }
);
