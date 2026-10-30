import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import type { TokenizeOrderRequestData } from '@support/http/models/order';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import { expect, test } from '@support/fixtures';
import { randomUUID } from 'crypto';
import { AdminOrderDetailsPage } from '@pages/admin/orders/adminOrderDetailsPage';
import * as crypto from 'crypto';
import envConfig from '@support/envConfig';

const configMerchant = new ConfigMerchant();
const orderID = randomUUID();

const payload = {
  order: {
    order_id: `${orderID.toString()}`,
    store_code: 'all',
    currency: 'BRL',
    items_total_amount: 75,
    tax_amount: 0,
    sub_total: 75,
    shipping_amount: 100,
    shipping_tax_amount: 0,
    total_tax_amount: 65,
    total_amount: 140,
    discounts: [],
    items: [
      {
        id: '99eccee2-742b-40e2-98f5-ff606bbc15b7',
        name: 'Premium Baby Beef',
        description: 'Premium Baby Beef Estância 92 Angus Resfriado',
        total_amount: {
          original_amount: 2100,
          amount: 2050,
          total_discount: 100,
          currency: 'BRL',
          currency_symbol: 'R$',
        },
        unit_price: {
          amount: 1050,
          currency: 'BRL',
          currency_symbol: 'R$',
        },
        tax_amount: {
          amount: 50,
          currency: 'BRL',
          currency_symbol: 'R$',
        },
        quantity: 2,
        image_url:
          'https://media-cdn.tripadvisor.com/media/photo-s/1a/e2/c6/68/porcion-de-papas-a-la.jpg',
        taxable: true,
      },
    ],
    shipping_address: {
      id: '204',
      first_name: 'Joao',
      last_name: 'Silva',
      email: 'Miguel_Kshlerin@gmail.com',
      address1: 'Av. Pres. Juscelino Kubitschek',
      address2: '3ro. Andar',
      zipcode: '04543-011',
      city: 'São Paulo',
      state_name: 'SP',
      country_code: 'BRA',
      identity_document: '52672745000112',
      identity_document_type: 'CNPJ',
      phone: '+5511985176644',
      lat: -22.943934,
      lng: -43.182984,
      additional_description: 'confirmar',
      address_type: 'casa',
    },
    billing_address: {
      id: '179',
      first_name: 'Joao',
      last_name: 'Silva',
      email: 'Caterina_Shields@yahoo.com',
      address1: 'Av. Pres. Juscelino Kubitschek',
      address2: '3ro. Andar',
      zipcode: '04543-011',
      city: 'São Paulo',
      state_name: 'SP',
      country_code: 'BRA',
      identity_document: '52672745000112',
      identity_document_type: 'CNPJ',
      phone: '+5511985176644',
      lat: -23.555425,
      lng: -46.677048,
      address_type: 'casa',
    },
    user_instructions: 'pesar antes de enviar',
    browser_details: {
      screen_height: 1000,
      screen_width: 2000,
    },
  },
};

const purchasePayload = {
  token: '',
  email: 'broman@deuna.com',
  method_type: 'bank_transfer',
  processor_name: 'asaas_pix',
  device_id: '2702febc-cd74-4ad5-918d-7645da99bc93',
  user_id: null,
  specific_fields: {
    description: 'TEST DESCRIPTION',
  },
  billing_address: {
    id: 102,
    first_name: 'Jean',
    last_name: 'Roldan',
    email: 'jroldan@deuna.com',
    identification: '853.513.468-93',
    identification_type: 'CPF',
    address1: 'Rua Capote Valente',
    address2: 'Pinheiros',
    zipcode: '05409000',
    city: 'São Paulo',
    state_name: 'SP',
    country: 'BR',
    phone: '+5521988939196',
    address_type: 'home',
  },
  shipping_address: {
    id: 770,
    first_name: 'Pablo',
    last_name: 'Murillo',
    email: 'jmurillo@deuna.com',
    identification: '870.685.970/41',
    identification_type: 'CPF',
    address1: 'Praia de Botafogo St.,',
    address2: '3o. Andar',
    zipcode: '22250040',
    city: 'Rio de Janeiro',
    state_name: 'RJ',
    country: 'BR',
    phone: '+551146733466',
    address_type: 'home',
  },
  browser_details: {
    screen_height: 1200,
    screen_width: 600,
    user_agent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    ip_address: '192.168.0.100',
  },
};

test.describe('@regression feature to validate with the automated test case', () => {
  let userAuthToken: string;
  let idWebhookTemp: string;
  let orderToken: string;
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async ({ asaasService }) => {
    const merchant = await configMerchant.basicSetup('BR');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    const processorId = await apiCallNewman.createPaymentProcessor(
      processorsConfig.asaasPixProcessor,
      merchantId,
      merchantToken
    );

    await test.step('Create webhooks to asaas_pix', async () => {
      const webhookUrl = `${envConfig.BASE_URL_POSTMAN}/transactions/webhooks/payconnect/${processorId}`;
      const webhookResponse = await asaasService.createWebhook(webhookUrl);
      const webhookData = webhookResponse.data as any;
      expect(webhookData).toBeDefined();
      expect(webhookData.id).toBeDefined();
      idWebhookTemp = webhookData.id;
    });

    userAuthToken = await apiCallNewman.loginGuest(merchantId, crypto.randomUUID(), privateKey);
  });

  test.fixme(
    '@PF-T35 Purchase exitoso con asaas_pix via API en Brasil',
    {
      tag: ['@team_payconnect', '@team_payment_integration', '@team_enterprise'],
      annotation: { type: 'bug', description: 'PI-3277' },
    },
    async ({ page, context, emaService, asaasService, paymentService }) => {
      const adminOrderDetailsPage = new AdminOrderDetailsPage(page, 'PT');
      let token: string;
      await test.step('Order tokenization and purchase by user', async () => {
        const tokenized = await emaService.tokenizeOrderWithCustomBody(
          privateKey,
          payload as unknown as TokenizeOrderRequestData
        );
        orderToken = tokenized.data.token;
        purchasePayload.token = orderToken;
        const purchaseResponse = (
          await paymentService.purchase(privateKey, userAuthToken, purchasePayload as any)
        ).data as any;
        expect(purchaseResponse).toBeDefined();
        const ordenResult = purchaseResponse.order;
        expect(ordenResult).toBeDefined();
        expect(ordenResult.status).toBe('pending');
        const paymentData = purchaseResponse.order.payment.data;
        expect(paymentData).toBeDefined();
        expect(paymentData.status).toBe('pending');
        const authorizationBankTransfer = paymentData.authorization_bank_transfer;
        expect(authorizationBankTransfer).toBeDefined();
        token = authorizationBankTransfer.token;
      });

      await test.step('Simulate payment to asaas_pix', async () => {
        const simResponse = await asaasService.simulatePixPayment(token);
        const simulateResponse = simResponse.data as any;
        expect(simulateResponse).toBeDefined();
        expect(simulateResponse.status).toBe('AWAITING_REQUEST');
      });

      await test.step('Validate processed order successfully with status processed', async () => {
        await adminOrderDetailsPage.goToOrderDetails(merchantId, orderToken);
        await adminOrderDetailsPage.assertPaymentStatus('processed', 5, 5000);
      });

      await test.step('Delete webhooks of asaas_pix', async () => {
        const deleteResponse = await asaasService.deleteWebhook(idWebhookTemp);
        const simulateResponse = deleteResponse.data as any;
        expect(simulateResponse).toBeDefined();
        expect(simulateResponse.deleted).toBeDefined();
        expect(simulateResponse.deleted).toEqual(true);
      });
    }
  );
});
