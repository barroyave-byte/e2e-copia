import { EmailGenerator } from '@support/utils/EmailGenerator';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { AplazoFormPage } from '@pages/explore/forms/aplazo/aplazoFormPage';
import {
  createNavitaireMerchant,
  generateConfirmationId,
  generatePaymentId,
  getAuthorizeResult,
  NavitaireCredentials,
} from './common';
import { expect, test } from '@support/fixtures';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';

test.describe('@regression Purchase using APM expiration', () => {
  test(
    '@PLAT-T1605 Should receive ManuallyDeclineWithValidation when trying to authorize an expired order',
    { tag: ['@team_platform', '@navitaire'] },
    async ({ page, navitaireService, emaService }) => {
      const configMerchant = new ConfigMerchant();
      const paymentId = generatePaymentId();
      const confirmationId = generateConfirmationId();
      const orderId = `${confirmationId}_${paymentId}`;
      let navitaireMerchant: NavitaireCredentials;
      let orderToken: string;
      let merchantId: string;
      let merchantToken: string;
      let merchantName: string;
      let privateKey: string;
      let publicKey: string;
      let authorizeResult: any;

      await test.step('Should create a new merchant on DEUNA configured with Stripe and able to make purchase v2 without user token', async () => {
        const merchant = await configMerchant.basicSetup('MX');
        merchantId = merchant.merchantId;
        merchantToken = merchant.merchantToken;
        merchantName = merchant.merchantName;
        privateKey = merchant.privateKey;
        publicKey = merchant.publicKey;
        await apiCallNewman.createPaymentProcessor(
          processorsConfig.aplazoProcessor,
          merchantId,
          merchantToken
        );
        await apiCallNewman.createNetwork(merchantId, merchantToken);
      });

      await test.step('Should create a new merchant on navitaire middleware', async () => {
        navitaireMerchant = await createNavitaireMerchant(merchantId, privateKey, merchantToken);
      });

      await test.step('Create order on authorize', async () => {
        const response = await navitaireService.authorize({
          username: navitaireMerchant.username,
          password: navitaireMerchant.password,
          paymentId,
          confirmationId,
          userEmail: EmailGenerator.generatePayerEmail(),
          installments: '1',
          paymentMethod: 'GenericPaymentMethod',
          amount: '100.0',
          currencyCode: 'MXN',
        });
        authorizeResult = getAuthorizeResult(response.data);

        expect(authorizeResult.ValidationResult.Succeeded).toBe(true);
        expect(authorizeResult.PaymentProcessingResult).toBe('PendingCustomerAction');

        orderToken = authorizeResult.PropertyBag.Items.NameValue.find(
          (item: { Name: string; Value: string }) => item.Name === 'order_token'
        )?.Value;
        expect(orderToken).toBeDefined();

        const clientConfirmationId = authorizeResult.PaymentIdentification.ClientConfirmationId;
        expect(clientConfirmationId).toBeDefined();

        const clientPaymentId = authorizeResult.PaymentIdentification.ClientPaymentId;
        expect(clientPaymentId).toBeDefined();
      });

      await test.step('Expire order', async () => {
        await emaService.expireOrder(orderToken, privateKey);
      });

      await test.step('Validate expiration', async () => {
        const resultGetOrder = await apiCallNewman.getOrderPaymentStatus(privateKey, orderToken);
        const bodyResponse = resultGetOrder.bodyResponse;

        expect(bodyResponse.order.status).toEqual('expired');
      });

      await test.step('Should fail when trying to pay with Aplazo', async () => {
        const paymentPage = new AplazoFormPage(page);

        const testingTool = nagivateAndConfigureWidget(page, 'Formularios');
        await testingTool.navigateAndSetup({
          orderToken: orderToken,
          merchantCredentials: { publicKey: publicKey, privateKey: privateKey },
        });

        await paymentPage.selectAplazoForm();

        await paymentPage.clickPay();
        await page.waitForTimeout(10000); // Wait for iframe to load

        const iframes = await page.locator('iframe').count();

        expect(iframes).toBeGreaterThan(0);
        let foundEmaError = false;
        for (let i = 0; i < iframes; i++) {
          const iframe = page.frameLocator(`iframe >> nth=${i}`);
          const emaInIframe = await iframe.getByText('EMA-6019').count();
          if (emaInIframe > 0) {
            foundEmaError = true;
            break;
          }
        }
        expect(foundEmaError).toBeTruthy();
      });
    }
  );
});
