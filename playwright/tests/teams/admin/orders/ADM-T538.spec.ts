import { EmailGenerator } from '@support/utils/EmailGenerator';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import * as creditCardData from '@support/interfaces/credit_cards';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as userData from '@support/interfaces/user_data';
import ConfigMerchantCheckout from '@support/api_sup/config_merchant_sup/configMerchantCheckout';
import { DeunacheckoutOrderBuilder } from '@support/http/testData/ema/DEUNA_CHECKOUT/DeunacheckoutOrderBuilder';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { expect, test } from '@support/fixtures';

const configMerchantCheckout = new ConfigMerchantCheckout();

test.describe('@regression feature to validate with automated test case', () => {
  let merchantId = '';
  let merchantToken = '';
  let privateKey = '';
  let merchantName = '';

  test.beforeAll(async () => {
    const merchant = await configMerchantCheckout.basicSetup('CO');
    merchantName = merchant.merchantName;
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiSpreedlyProcessorCO,
      merchantId,
      merchantToken
    );
  });

  test(
    '@ADM-T538 Address details',
    { tag: ['@admin', '@smoke', '@admin-preprod', '@team_admin', '@preprod', '@admin_ui'] },
    async ({ page, emaService, userAuthService, paymentService }) => {
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page);
      const customerEmail = EmailGenerator.generatePayerEmail();
      const expectedPhone = `+57 ${userData.userDataCO.phone}`;
      const expectedAddressFields = {
        first_name: userData.userDataCO.name,
        last_name: userData.userDataCO.last_name,
        phone: expectedPhone,
        identity_document: userData.userDataCO.dni,
        address1: 'Nueva Autopista Norte',
        city: 'Bogotá',
        state_name: 'Bogotá',
        zipcode: '110121',
        country: 'CO',
        country_code: 'CO',
        email: customerEmail,
      };
      let orderToken = '';

      await test.step('Tokenize a checkout order with custom billing and shipping addresses', async () => {
        const orderData = DeunacheckoutOrderBuilder.createOrder('CO', {
          user_email: customerEmail,
        });
        orderData.order.billing_address = {
          ...orderData.order.billing_address,
          ...expectedAddressFields,
        };
        orderData.order.shipping_address = {
          ...orderData.order.shipping_address,
          ...expectedAddressFields,
        };
        const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          orderData
        );
        orderToken = tokenizeResponse.data.token;
      });

      await test.step('Pay the order via API with a Spreedly Visa card', async () => {
        const guestLogin = await userAuthService.loginAsGuest(merchantId, privateKey);
        const purchaseResponse = await paymentService.purchaseV2(
          privateKey,
          guestLogin.data.token,
          buildPurchaseV2Payload({
            country: 'CO',
            processorName: processorsConfig.kushkiSpreedlyProcessorCO.name,
            card: creditCardData.spreedlyVisaSuccessful,
            token: orderToken,
            email: customerEmail,
          })
        );
        expect(purchaseResponse.status).toBe(200);
      });

      await test.step('The user navigates to the order details in admin', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertCustomerDataIsCorrect(
          userData.userDataCO.name,
          userData.userDataCO.last_name
        );
      });

      await test.step('The user opens Billing Address and verifies details', async () => {
        await adminOrderDetailsPage.showBillingAddress();
        await adminOrderDetailsPage.assertBillingAddressDetails(
          userData.userDataCO.name,
          expectedPhone,
          userData.userDataCO.dni,
          'Bogotá',
          'Bogotá',
          '110121',
          'CO',
          'Nueva Autop'
        );
      });

      await test.step('The user opens Shipping Address and verifies details', async () => {
        await adminOrderDetailsPage.showShippingAddress();
        await adminOrderDetailsPage.assertShippingAddressDetails(
          userData.userDataCO.name,
          expectedPhone,
          userData.userDataCO.dni,
          'Bogotá',
          'Bogotá',
          '110121',
          'CO',
          'Nueva Autop'
        );
      });
    }
  );
});
