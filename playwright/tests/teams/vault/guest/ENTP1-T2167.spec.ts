import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { VaultWidgetPage } from '@pages/vault/vaultWidgetPage';
import { IDENTITY_DOCUMENTS } from '@support/constants/identityDocuments';

const configMerchant = new ConfigMerchant();

test.describe(
  '@regression Kushki EC - Vault Widget: Correct card validation',
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
      const merchant = await configMerchant.basicSetup('EC');
      merchantId = merchant.merchantId;
      merchantToken = merchant.merchantToken;
      merchantName = merchant.merchantName;
      privateKey = merchant.privateKey;
      publicKey = merchant.publicKey;
      await apiCallNewman.configureVaultWidget(merchantId, merchantToken);
      await apiCallNewman.createPaymentProcessor(
        processorsConfig.kushkiProcessorEC,
        merchantId,
        merchantToken
      );
      const tokenized = await emaService.tokenizeDeunaNowOrder('EC', privateKey);
      orderToken = tokenized.data.token;
      orderId = tokenized.data.order.order_id;
    });

    test.beforeEach(
      'Should open the testing page and select the required experience',
      async ({ page }) => {
        const testingTool = nagivateAndConfigureWidget(page, 'Payment vault (modal)');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });
      }
    );

    test(
      '@ENTP1-T2167 Kushki EC - Vault Widget: Correct validation of credit card credentials to save it',
      { tag: ['@smoke', '@preprod', '@checkout_ui', '@team_enterprise'] },
      async ({ page }) => {
        const vaultWidgetPage = new VaultWidgetPage(page);

        await test.step('Should fill new card form.', async () => {
          const card = {
            number: '5049971111111112',
            expiration_date: '1132',
            cvv_code: '123',
            cardholder_name: 'John Doe',
            document_number: IDENTITY_DOCUMENTS.EC.CI,
          };

          await vaultWidgetPage.fillCardNumber(card.number);
          await vaultWidgetPage.fillExpDate(card.expiration_date);
          await vaultWidgetPage.fillCVV(card.cvv_code);
          await vaultWidgetPage.fillCardHolder(card.cardholder_name);
          await vaultWidgetPage.fillIdentityNumber(card.document_number);
          await vaultWidgetPage.assertButtonEnabled();
        });

        await test.step('Should be able to try to save the card and receive a 201 response status', async () => {
          const cardsResponsePromise = page.waitForResponse('**/users/*/cards');
          await vaultWidgetPage.clickOnSave();
          const cardsResponse = await cardsResponsePromise;
          const cardResponse = await cardsResponse.json();
          expect(cardsResponse.status()).toEqual(201);
          expect(cardResponse.data.company).toEqual('alia');
        });
      }
    );
  }
);
