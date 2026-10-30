import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { EcommercePage } from '@pages/explore/ecommercePage';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';

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
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken);
    });

    test(
      '@ENTP1-T2366 Verify default minor units for amounts based on currencies',
      { tag: ['@smoke', '@review_action', '@preprod', '@checkout_ui', '@team_enterprise'] },
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
          const DEFAULT_MXN_DECIMALS = 2;
          await vaultWidgetPage.assertMinorUnits(DEFAULT_MXN_DECIMALS);
        });

        await test.step('Should adjust amount for card 1', async () => {
          await vaultWidgetPage.adjustAmountForCard1('10.2689');
          await vaultWidgetPage.clickOnTotalToPay();
        });

        await test.step('Should verify amount for card 1', async () => {
          await vaultWidgetPage.assertAdjustAmountForCard1('10.27');
        });
      }
    );
  }
);
