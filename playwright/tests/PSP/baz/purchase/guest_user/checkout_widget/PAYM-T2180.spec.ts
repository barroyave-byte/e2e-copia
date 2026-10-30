import { test, expect } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import { PURCHASE_URL_PATTERN, isV2PurchaseRequest } from '@support/utils/purchase-contracts';
import { faker } from '@faker-js/faker';
import * as userAddress from '@support/interfaces/address_user';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as userData from '@support/interfaces/user_data';

test.describe('@regression BAZ MX Purchase error', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let publicKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async ({ emaService }) => {
    const configMerchant = new ConfigMerchant();
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    publicKey = merchant.publicKey;
    const tokenized = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = tokenized.data.token;
    orderId = tokenized.data.order.order_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.bazProcessorAuthorize_MX,
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
    '@PAYM-T2180 Purchase fallido con BAZ en Mexico - Se recibe un error personalizado de BAZ al mandar una tarjeta incompleta',
    { tag: ['@payments_integration', '@team_payment_integration', '@preprod', '@purchase'] },
    async ({ page }) => {
      const paymentDeunaNowPage = new PaymentDeunaNowPage(page, 'ES');

      await test.step('The user enters the credit card information of the BAZ Visa', async () => {
        await paymentDeunaNowPage.fillCreditCardDataDeunaNow(creditCardData.bazVisaCardSuccessful, {
          country: 'MX',
        });
      });

      await test.step('The user clicks pay with mocked card number', async () => {
        await mockHolderNumberCreditCardBaz({ page });
        await paymentDeunaNowPage.clickOnPayButton();
      });

      await test.step('Validate that the order has not been processed successfully with status 422', async () => {
        await paymentDeunaNowPage.assertOrderStatusRequestPurchase('denied', 422);
        const responsePurchase = await paymentDeunaNowPage.responsePromise;
        const responsePurchaseBody = await responsePurchase.json();
        expect(responsePurchaseBody.error.code).toBe('DP-7101');
        expect(responsePurchaseBody.error.description).toBe(
          'Payment was declined. Try another card or contact your bank.'
        );
      });
    }
  );
});

async function mockHolderNumberCreditCardBaz(t) {
  await t.page.route(PURCHASE_URL_PATTERN, (route) => {
    const request = route.request();
    if (request.method() !== 'POST') return route.continue();

    const postData = JSON.parse(request.postData());

    if (isV2PurchaseRequest(postData)) {
      postData.payment_source = postData.payment_source ?? {};
      postData.payment_source.card_info = postData.payment_source.card_info ?? {};
      postData.payment_source.card_info.card_number = '12345678';
    } else {
      postData.credit_card.card_number = '12345678';
    }

    route.continue({ postData: JSON.stringify(postData) });
  });
}
