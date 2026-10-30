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
        decimals: 0,
      },
    ],
  },
};

test.describe(
  '@regression Payment Widget - Split Payments - Integer validation (0 decimals)',
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
        amount: 10500,
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
      '@ENTP1-T2390 Split Payments: Manejo sin decimales',
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

        await test.step('Validate minor units configured to 0 decimals', async () => {
          await vaultWidgetPage.assertMinorUnits(0);
        });

        await test.step('Validate initial split: card1 floor(total/2) and card2 remainder', async () => {
          const currencyRegex = /^[^\s]+\s*/;
          const totalText = await vaultWidgetPage.inputTotalToPay.textContent();
          const total = parseFloat(totalText.replace(currencyRegex, ''));
          const expectedCard1 = 52;
          const expectedCard2 = 53;

          const card1Value = await vaultWidgetPage.inputAdjustAmountCard1.inputValue();
          const card2Value = await vaultWidgetPage.inputAdjustAmountCard2.inputValue();
          const amount1 = parseInt(card1Value, 10);
          const amount2 = parseInt(card2Value, 10);

          expect(amount1).toBe(expectedCard1);
          expect(amount2).toBe(expectedCard2);
          expect(total).toBe(amount1 + amount2);
        });

        await test.step('Inputs accept only digits: block dot, comma and letters', async () => {
          const invalidInputs = ['12.34', '12,34', 'abc', '1a2', '.'];
          for (const attempt of invalidInputs) {
            await vaultWidgetPage.adjustAmountForCard1(attempt);
            await vaultWidgetPage.clickOnTotalToPay();
            const updatedCard1 = await vaultWidgetPage.inputAdjustAmountCard1.inputValue();
            const normalized = updatedCard1;
            expect(/^[0-9]+$/.test(normalized)).toBeTruthy();
          }
        });
      }
    );
  }
);
