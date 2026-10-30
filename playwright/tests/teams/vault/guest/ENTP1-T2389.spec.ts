import { test, expect } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { widgetsGeneralConfig } from '@support/mocks/newThemeConfig';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { userEmail } from '@support/interfaces/orders';
import { PaymentPage } from '@pages/payment_link/payment/paymentPage';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT';

const configMerchant = new ConfigMerchant();

const widgetConfig = {
  ...widgetsGeneralConfig,
  currencies: {
    minor_units: [
      {
        currency: 'MXN',
        decimals: 2,
      },
    ],
  },
};

test.describe(
  '@regression Payment Widget - Split Payments - 2 decimals validation',
  { tag: ['@checkout', '@elements_link', '@vault'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;

    let orderToken: string;

    test.beforeAll(async ({ emaService }) => {
      const merchant = await configMerchant.basicSetup('MX');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken, {
        widgets_general_config: widgetConfig,
      });

      const email = userEmail();
      const orderBody = DeunacheckoutOrderBuilder.createBody('MX', {
        amount: 10550,
        payment_method: null,
        lat: -41.743,
        lng: 11.987,
        city: '',
        country: '',
        country_code: '',
      });

      orderToken = (await emaService.tokenizeOrderWithCustomBody(privateKey, orderBody)).data.token;
    });

    test(
      '@ENTP1-T2389 Split Payments: Manejo con decimales',
      { tag: ['@smoke', '@split_payment', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);
        const paymentPage = new PaymentPage(page);

        await test.step('Setup Explore and prepare cart with Split Payment enabled', async () => {
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
        });

        await test.step('Go to Split Payments', async () => {
          await vaultWidgetPage.clickPayWithTwoCards();
        });

        await test.step('Validate minor units configured to 2 decimals', async () => {
          await vaultWidgetPage.assertMinorUnits(2);
        });

        await test.step('Validate initial amounts are split in half with 2 decimals', async () => {
          const currencyRegex = /^[^\s]+\s*/;
          const totalText = await vaultWidgetPage.inputTotalToPay.textContent();
          const total = parseFloat(totalText.replace(currencyRegex, ''));
          const half = 52.75;

          const card1Value = await vaultWidgetPage.inputAdjustAmountCard1.inputValue();
          const card2Value = await vaultWidgetPage.inputAdjustAmountCard2.inputValue();

          const amount1 = parseFloat(card1Value);
          const amount2 = parseFloat(card2Value);

          expect(amount1).toBe(half);
          expect(amount2).toBe(half);
          expect(total).toBe(amount1 + amount2);
        });

        await test.step('Input accepts only one decimal point (blocks multiple points)', async () => {
          const currentCard1 = await vaultWidgetPage.inputAdjustAmountCard1.inputValue();
          const numeric = currentCard1;
          const withDoubleDot = numeric.replace('.', '..');

          await vaultWidgetPage.adjustAmountForCard1(withDoubleDot);
          await vaultWidgetPage.clickOnTotalToPay();

          const updatedCard1 = await vaultWidgetPage.inputAdjustAmountCard1.inputValue();
          const normalized = updatedCard1;

          expect((normalized.match(/\./g) || []).length).toBe(1);
          expect(/^\d+\.\d{2}$/.test(normalized)).toBeTruthy();
        });
      }
    );
  }
);
