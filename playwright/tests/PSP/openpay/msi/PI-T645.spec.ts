import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as creditCardData from '@support/interfaces/credit_cards';
import { test, expect } from '@support/fixtures';
import { buildPurchaseV2Payload } from '@support/http/testData/payment/PurchaseV2PayloadBuilder';
import { retryGetOrderStatus } from '@support/utils/retries';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import { SHIPPING_RATE_URLS } from '@support/http/testData/ema/DEUNA_CHECKOUT';

let merchantId: string;
let merchantToken: string;
let privateKey: string;
let orderToken: string;
let merchantName: string;
let transactionId: string;
let responsePurchase: any;
const configMerchant = new ConfigMerchant();

test.describe('@regression Pays with OpenPay MX MSI', () => {
  test.beforeAll(async ({ emaService }) => {
    const merchantConfig = await configMerchant.basicSetup('MX');
    merchantName = merchantConfig.merchantName;
    merchantId = merchantConfig.merchantId;
    merchantToken = merchantConfig.merchantToken;
    privateKey = merchantConfig.privateKey;
    const tokenizeResponse = await emaService.tokenizeOrderWithCustomBody(privateKey, {
      order_type: 'DEUNA_CHECKOUT',
      order: {
        order_id: `msi-test-${crypto.randomUUID()}`,
        store_code: 'all',
        currency: 'MXN',
        tax_amount: 0,
        shipping_amount: 0,
        items_total_amount: 250000,
        sub_total: 250000,
        total_amount: 250000,
        total_tax_amount: 0,
        display_total_amount: 'MXN 2500.00',
        items: [
          {
            id: '2788',
            name: 'BBQ Crunch',
            description: 'Test product for MSI',
            quantity: 1,
            total_amount: {
              amount: 250000,
              currency: 'MXN',
              currency_symbol: '$',
            },
            unit_price: {
              amount: 250000,
              currency: 'MXN',
              currency_symbol: '$',
            },
          },
        ],
        shipping_address: {
          first_name: 'QA',
          last_name: 'TEST',
          phone: '5559062217',
          identity_document: '12345678',
          address1: 'Av. Paseo de la Reforma 222',
          address2: 'Piso 10',
          city: 'Mexico City',
          zipcode: '06600',
          state_name: 'Ciudad de México',
          country: 'MX',
          country_code: 'MX',
          email: `test-${crypto.randomUUID()}@deuna.com`,
        },
        billing_address: {
          first_name: 'QA',
          last_name: 'TEST',
          phone: '5559062217',
          identity_document: '12345678',
          address1: 'Av. Paseo de la Reforma 222',
          address2: 'Piso 10',
          city: 'Mexico City',
          zipcode: '06600',
          state_name: 'Ciudad de México',
          country: 'MX',
          country_code: 'MX',
          email: `test-${crypto.randomUUID()}@deuna.com`,
        },
        webhook_urls: {
          shipping_rate: SHIPPING_RATE_URLS.MEXICO_MSI,
        },
      },
    });
    orderToken = tokenizeResponse.data.token;
    transactionId = tokenizeResponse.data.order.transaction_id;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.openPayProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createCampaignMSI('MXN', merchantId, merchantToken);
  });

  test(
    '@PI-T645 Crear una transaccion con MSI con estado Processed con Usuario Invitado con procesador OpenPay',
    {
      tag: [
        '@payments_integration',
        '@installments',
        '@preprod',
        '@purchase',
        '@team_payment_integration',
        '@api',
      ],
    },
    async ({ paymentService, userAuthService, emaService }) => {
      const installments = 3;

      await test.step('The user send purchase request with installments', async () => {
        const responseUserAuth = await userAuthService.loginAsGuest(merchantId, privateKey);
        const userToken = responseUserAuth.data.token;
        responsePurchase = await paymentService.purchaseV2(
          privateKey,
          userToken,
          buildPurchaseV2Payload({
            country: 'MX',
            processorName: processorsConfig.openPayProcessor.name,
            card: creditCardData.openpayVisaSuccessful,
            token: orderToken,
            installments: installments,
          })
        );
      });

      await test.step('The transaction is processed', async () => {
        expect(responsePurchase.status).toBe(200);
        await retryGetOrderStatus(emaService, privateKey, orderToken, 'processed');
      });

      await test.step('Validate installments from order API', async () => {
        const orderResponse = await emaService.getOrder(privateKey, orderToken);
        const paymentData = orderResponse.data.order.payment?.data;

        expect(paymentData?.status).toBe('processed');
        expect(paymentData?.from_card?.installment?.installments).toBe(installments);
        expect(paymentData?.from_card?.installment?.installment_type).toBe('MSI');
      });
    }
  );
});
