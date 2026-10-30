import { test } from '@support/fixtures';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import { SERVICE_KEYS, ServiceFactory } from '@support/http';
import { expect } from '@playwright/test';

const configMerchant = new ConfigMerchant();
let transactionId: string;
let merchantId: string;
let merchantToken: string;
let privateKey: string;

test.describe('@regression Get Installments for Dynamic Routing', () => {
  test.beforeAll(async ({ paymentMsiService, emaService }) => {
    const {
      merchantId: mid,
      merchantToken: mtk,
      privateKey: privKey,
    } = await configMerchant.basicSetup('MX');
    merchantId = mid;
    merchantToken = mtk;
    privateKey = privKey;
    const paymentRoutingService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT_ROUTING);
    const paymentService = ServiceFactory.getService(SERVICE_KEYS.PAYMENT);

    await apiCallNewman.createPaymentProcessor(
      processorsConfig.conektaProcessorMSI,
      merchantId,
      merchantToken
    );
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.kushkiProcessor,
      merchantId,
      merchantToken
    );

    // Dynamic routing rules: installments=3 → conekta (id 11), installments=6 → kushki (id 40)
    await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'installments 3 rule',
      priority: 1,
      status: 'enabled',
      is_default: false,
      trigger: 'payment',
      conditions: [
        { rule_option: { id: 7, label: 'number_installments' }, operator: 'eq', operand: '3' },
      ],
      members: [{ payment_processor_id: 11, sort: 1, strategy: 'cascade' }],
    });

    await paymentRoutingService.createMerchantRule(merchantId, merchantToken, {
      label: 'installments 6 rule',
      priority: 2,
      status: 'enabled',
      is_default: false,
      trigger: 'payment',
      conditions: [
        { rule_option: { id: 7, label: 'number_installments' }, operator: 'eq', operand: '6' },
      ],
      members: [{ payment_processor_id: 40, sort: 1, strategy: 'cascade' }],
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

    await paymentService.configurationMerchantPayments({
      merchantToken,
      merchantId,
      storeId: 'all',
      configurationMerchantPaymentsData: {
        config_code: 'USE_DYNAMIC_ROUTING',
        config_value: 'ENABLED',
      },
    });

    const orderResponse = await emaService.tokenizeDeunaNowOrder('MX', privateKey);
    transactionId = orderResponse.data.order.transaction_id;

    await paymentRoutingService.consultationTrigger(
      merchantId,
      merchantToken,
      {
        transaction_id: transactionId,
        method_type: 'credit_card',
        amount: 500000,
        card_info: {
          bin: '544204',
          bank: 'SCOTIABANK',
          branch: 'mastercard',
          card_type: 'credit',
          country: 'Mexico',
          country_iso: 'MX',
          currency: 'MXN',
        },
        store_code: 'all',
      },
      'number_installments'
    );
  });

  test(
    '@PAYM-T1838 Get Installments with Dynamic Routing Check',
    { tag: ['@dynamic_routing', '@installments', '@team_payments_capabilities'] },
    async ({ paymentMsiService }) => {
      const assertInstallmentPlans = async (stepLabel: string) => {
        await test.step(stepLabel, async () => {
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
          expect(installments).toHaveLength(3);
          expect(installments[0].installments).toBe(1);
          expect(installments[0].installments_amount).toBe(500000);
          expect(installments[1].installments).toBe(3);
          expect(installments[1].installments_amount).toBe(166666);
          expect(installments[2].installments).toBe(6);
          expect(installments[2].installments_amount).toBe(83333);
        });
      };

      await assertInstallmentPlans('The installments for operation is applied successfully');
      await assertInstallmentPlans(
        'The installments for operation is applied successfully (second verification)'
      );
    }
  );
});
