import { EmailGenerator } from '@support/utils/EmailGenerator';
import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';

const configMerchantVault = new ConfigMerchant();
const globalAssert = new GlobalAssert();

const COUNTRY_CASES = [
  { country: 'BR', processor: processorsConfig.worldpayProcessor_BR },
  { country: 'GT', processor: processorsConfig.worldpayProcessor_GT },
  { country: 'PE', processor: processorsConfig.worldpayProcessor_PE },
] as const;

test.describe('@regression Worldpay Purchase declined via vault', () => {
  const email = EmailGenerator.generatePayerEmail();

  test(
    '@PI-T1100 Purchase declinado Visa con WorldPay usando vault en Brasil, Guatemala y Peru',
    { tag: ['@payments_integration', '@smoke', '@fixme_preprod', '@team_payment_integration'] },
    async ({ page, emaService }) => {
      for (const { country, processor } of COUNTRY_CASES) {
        await test.step(`${country}`, async () => {
          const vaultWidgetPage = new VaultWidgetPage(page);

          let merchantId: string;
          let merchantToken: string;
          let merchantName: string;
          let privateKey: string;
          let publicKey: string;
          let orderToken: string;
          let orderId: string;

          await test.step('The user opens the testing page and opens the required widget', async () => {
            const merchant = await configMerchantVault.basicSetup(country);
            merchantId = merchant.merchantId;
            merchantToken = merchant.merchantToken;
            merchantName = merchant.merchantName;
            privateKey = merchant.privateKey;
            publicKey = merchant.publicKey;
            await apiCallNewman.createCheckoutConfigVault(merchantId, merchantToken);
            await apiCallNewman.createNetwork(merchantId, merchantToken);
            const tokenized = await emaService.tokenizeDeunaNowOrder(country, privateKey);
            orderToken = tokenized.data.token;
            orderId = tokenized.data.order.order_id;
            await apiCallNewman.createPaymentProcessor(processor, merchantId, merchantToken);

            const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
            await testingTool.navigateAndSetup({
              orderToken: orderToken,
              merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
            });
          });

          await test.step('fill out the credit card form and click save', async () => {
            await vaultWidgetPage.fillFormVault(creditCardData.cybersourceVisaFailed, { country });
            await vaultWidgetPage.clickOnPay();
          });

          await test.step('It is validated that the card and purchase V2 request is sent', async () => {
            const cardId = await vaultWidgetPage.assertCardRequest();
            await vaultWidgetPage.assertOrderStatusRequestPurchaseV2('denied', 422, cardId);
            await page.waitForTimeout(1000);
            await globalAssert.assertTransactionPaymentStatus('denied', privateKey, orderToken); //TODO: se muestra por admin
          });
        });
      }
    }
  );
});
