import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import {
  BODY_MERCHANT_ROUTING_DEFAULT,
  BODY_PROCESSOR_KUSHKI_ROUTING_DEFAULT,
  BODY_PROCESSOR_CONEKTA_CREDIT_ROUTING_DEFAULT,
} from '@support/http/testData/paymentRouting/SmartRoutingConfig';
import { expect } from '@playwright/test';

const configMerchant = new ConfigMerchant();
let transactionId: string;
let merchantId: string;
let merchantName: string;
let privateKey: string;
let orderToken: string;
let orderId: string;
let merchantToken: string;

test.describe('@regression Get Installments for Smart Routing', () => {
  test.beforeAll(async ({ paymentMsiService, emaService, paymentRoutingService }) => {
    const config = await configMerchant.basicSetup('MX');
    merchantName = config.merchantName;
    privateKey = config.privateKey;
    merchantId = config.merchantId;
    merchantToken = config.merchantToken;

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.conektaProcessorMSI,
      merchantId,
      merchantToken
    );

    // Smart routing: KUSHKI + CONEKTA_CREDIT
    await paymentRoutingService.createMerchantRouting(merchantId, merchantToken, {
      ...BODY_MERCHANT_ROUTING_DEFAULT,
      id: merchantId,
    });
    await paymentRoutingService.createProcessorRouting(
      merchantId,
      merchantToken,
      BODY_PROCESSOR_KUSHKI_ROUTING_DEFAULT
    );
    await paymentRoutingService.createProcessorRouting(
      merchantId,
      merchantToken,
      BODY_PROCESSOR_CONEKTA_CREDIT_ROUTING_DEFAULT
    );

    const storeConfigResponse = await paymentRoutingService.createStoreRouting(
      merchantId,
      merchantToken,
      {
        store_code: 'all',
        algorithm_type: 'cascading',
        country: 'MX',
        is_active: true,
        settings: [{ processor_code: 'KUSHKI' }, { processor_code: 'CONEKTA_CREDIT' }],
      }
    );
    await paymentRoutingService.activeRoutingService(merchantId, merchantToken, {
      id: (storeConfigResponse.data as any).id,
    });

    await paymentMsiService.createInstallmentCampaign({
      merchantId,
      merchantToken,
      installmentsCampaignData: {
        name: 'campaña test conekta',
        description: 'campaña de test para conekta',
        status: 'active',
        processors: [{ id: 11, name: 'conekta_credit' }],
        options: [
          {
            installments: 3,
            installments_type: 'MSI',
            currency: 'MXN',
            card_branch: [
              {
                amount_min: 333.333,
                name: 'mastercard',
                cost: 0,
                installment_rate: 0,
                installments_interest_formula: '',
              },
            ],
          },
          {
            installments: 9,
            installments_type: 'MSI',
            currency: 'MXN',
            card_branch: [
              {
                amount_min: 111.11,
                name: 'mastercard',
                cost: 0,
                installment_rate: 0,
                installments_interest_formula: '',
              },
            ],
          },
        ],
      },
    });

    await paymentMsiService.createInstallmentCampaign({
      merchantId,
      merchantToken,
      installmentsCampaignData: {
        name: 'campaña test kushki',
        description: 'campaña de test para kushki',
        status: 'active',
        processors: [{ id: 40, name: 'kushki' }],
        options: [
          {
            installments: 6,
            installments_type: 'MSI',
            currency: 'MXN',
            card_branch: [
              {
                amount_min: 166.666,
                name: 'mastercard',
                cost: 0,
                installment_rate: 0,
                installments_interest_formula: '',
              },
            ],
          },
          {
            installments: 12,
            installments_type: 'MSI',
            currency: 'MXN',
            card_branch: [
              {
                amount_min: 83.333,
                name: 'mastercard',
                cost: 0,
                installment_rate: 0,
                installments_interest_formula: '',
              },
            ],
          },
        ],
      },
    });

    const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);
    await paymentService.configurationMerchantPayments({
      merchantToken,
      merchantId,
      storeId: 'all',
      configurationMerchantPaymentsData: { config_code: 'USE_ROUTING', config_value: 'ENABLED' },
    });

    const orderResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    orderToken = orderResponse.data.token;
    orderId = orderResponse.data.order.order_id;
    transactionId = orderResponse.data.order.transaction_id;
  });

  test(
    '@PAYM-T2070 Get Installments with Smart Routing Check',
    {
      tag: [
        '@preprod',
        '@installments_mci_msi',
        '@api',
        '@dynamic_routing',
        '@installments',
        '@team_payments_capabilities',
      ],
    },
    async ({ paymentMsiService }) => {
      await test.step('The installments for operation is applied successfully', async () => {
        const response = await paymentMsiService.getInstallments({
          merchantId,
          storeCode: 'all',
          merchantToken,
          amount: 500000,
          currency: 'MXN',
          bin: '544204',
          transactionId,
          country: 'MX',
        });
        expect(response.status).toBe(200);
        const { installments } = response.data;
        expect(installments).toHaveLength(5);
        expect(installments[0].installments).toBe(1);
        expect(installments[0].installments_amount).toBe(500000);
        expect(installments[1].installments).toBe(3);
        expect(installments[1].installments_amount).toBe(166666);
        expect(installments[2].installments).toBe(6);
        expect(installments[2].installments_amount).toBe(83333);
        expect(installments[3].installments).toBe(9);
        expect(installments[3].installments_amount).toBe(55555);
        expect(installments[4].installments).toBe(12);
        expect(installments[4].installments_amount).toBe(41666);
      });
    }
  );
});
