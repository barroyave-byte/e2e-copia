import { test } from '@support/fixtures';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

const configMerchant = new ConfigMerchant();

test.describe(
  '@regression Pays with Amex MX',
  { tag: ['@checkout', '@checkout_base', '@payment_widget'] },
  () => {
    let merchantId: string;
    let merchantToken: string;
    let merchantName: string;
    let privateKey: string;
    let publicKey: string;
    let orderToken: string;
    let orderId: string;

    test.beforeAll(async ({ emaService }) => {
      const merchantConfig = await configMerchant.basicSetup('MX');
      merchantId = merchantConfig.merchantId;
      merchantToken = merchantConfig.merchantToken;
      merchantName = merchantConfig.merchantName;
      privateKey = merchantConfig.privateKey;
      publicKey = merchantConfig.publicKey;
      const tokenized = await emaService.tokenizeDeunaNowOrder('MX', merchantConfig.privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.amexProcessor,
        merchantId,
        merchantToken
      );
    });

    test.beforeEach(
      'The user opens the testing page and opens the required widget',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment Widget');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2084 Validación del campo de mes en el formulario de checkout (No se permite "00")',
      { tag: ['@preprod', '@checkout_ui', '@team_payment_integration'] },
      async ({ page }) => {
        const paymentDeunaNowPage = new PaymentDeunaNowPage(page);

        await test.step('The user inserts a credit card amex with invalid expiration month', async () => {
          await paymentDeunaNowPage.fillCreditCardDataDeunaNow(
            {
              ...creditCardData.amexSuccessful,
              expiration_date: '0020',
            },
            { country: 'MX' }
          );
        });

        await test.step('The user sees an alert', async () => {
          await paymentDeunaNowPage.userSeesExpiryDateInvalidMonthErrorMessage();
        });
      }
    );
  }
);
