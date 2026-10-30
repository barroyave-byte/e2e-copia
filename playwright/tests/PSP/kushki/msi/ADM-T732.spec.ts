import { test } from '@support/fixtures';
import { PaymentDeunaNowPage } from '@pages/deuna_now/deunaNowPage';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import { nagivateAndConfigureWidget } from '@support/testing_tool/TestingTool';
import * as creditCardData from '@support/interfaces/credit_cards';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import GlobalAssert from '@support/api_sup/global_assert/globalAssert';
import { MethodType, PurchaseRequestV2 } from '@support/http/models/payment';

const configMerchant = new ConfigMerchant();
const globalAssert = new GlobalAssert();
let merchantPrivateKey = '';

test.describe('@regression MCI Purchase Flow - Zero Plan Option ID Validation', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;
  let orderToken: string;
  let orderId: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('CO');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    merchantPrivateKey = privateKey;

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessorCO,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createCampaignMCI('COP', merchantId, merchantToken);
  });

  test(
    '@ADM-T732 Purchase installments with zero plan_option_id validation',
    {
      tag: [
        '@payments_integration',
        '@installments',
        '@team_payment_integration',
        '@preprod',
        '@admin_ui',
      ],
    },
    async ({ emaService, paymentService, page }) => {
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'ES');

      await test.step('Perform purchase with zero plan_optio_id', async () => {
        const userAuthToken = await apiCallNewman.loginGuest(
          merchantId,
          crypto.randomUUID(),
          privateKey
        );

        const tokenizeResponse = await emaService.tokenizeDeunaNowOrder('CO', merchantPrivateKey, {
          amount: 250000,
          user_email: 'johndoe@email.com',
        });
        orderId = tokenizeResponse.data.order.order_id;

        orderToken = tokenizeResponse.data.token;

        let card = creditCardData.kushkiVisaSuccessfull;

        const purchaseRequest: PurchaseRequestV2 = {
          order_token: orderToken,
          payer_info: { email: 'johndoe@email.com' },
          payment_source: {
            method_type: MethodType.CREDIT_CARD,
            processor: '',
            card_info: {
              expiry_month: card.expiration_date.slice(0, 2),
              expiry_year: '20' + card.expiration_date.slice(2, 4),
              card_holder: card.cardholder_name,
              card_holder_dni: card.document_number,
              card_number: card.number,
              card_cvv: card.cvv_code,
              address1: '',
              zip: '',
              city: '',
              state: '',
              country: '',
              phone: '',
            },
            installment: {
              plan_option_id: '00000000-0000-0000-0000-000000000000',
            },
          },
        };

        await paymentService.purchaseV2(merchantPrivateKey, userAuthToken, purchaseRequest);
      });

      await test.step('Validate order status and installments', async () => {
        const status = 'processed';
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus(status);
        await globalAssert.assertInstallmentesType('', privateKey, orderToken);
      });
    }
  );
});
