import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as updateResponse from '@support/interfaces/installments';

const configMerchant = new ConfigMerchant();
const cost_greater_onehundred = {
  name: 'campaña día de la madre',
  description: 'campaña de test',
  status: 'active',
  start_date: '2023-09-13T14:30:00Z',
  end_date: '2023-10-13T14:30:00Z',
  display_label_template: {
    language: 'es',
    MSI: '{installments} de ${amount} sin interés',
    MCI: '{installments} de ${amount} con interés del {rate}%',
  },
  processors: [
    {
      id: 39,
      name: 'mercadopago',
      external_payment_plan_id: 'external_123456',
      mci_to_psp_as: 'MSI',
    },
  ],
  options: [
    {
      amount_min: 1000,
      amount_max: 1500,
      installments: 3,
      installments_type: 'MSI',
      currency: 'MXN',
      card_branch: [
        {
          name: 'visa',
          cost: 101,
          installment_rate: 0,
          installments_interest_formula: '',
        },
        {
          name: 'mastercard',
          cost: 0,
          installment_rate: 0,
          installments_interest_formula: '',
        },
      ],
    },
  ],
};

const respStatusCode = updateResponse.updateCostGreaterOneHundred.statusCode;
const respCode = updateResponse.updateCostGreaterOneHundred.code;
const respStatusMsg = updateResponse.updateCostGreaterOneHundred.error;

test.describe('@regression Installments Campaign', () => {
  let merchantId: string;
  let merchantToken: string;
  let merchantName: string;
  let privateKey: string;

  test.beforeAll(async () => {
    const merchant = await configMerchant.basicSetup('MX');
    merchantId = merchant.merchantId;
    merchantToken = merchant.merchantToken;
    merchantName = merchant.merchantName;
    privateKey = merchant.privateKey;
    await apiCallNewman.createPaymentProcessor(
      processorsConfig.mercadoPagoProcessor,
      merchantId,
      merchantToken
    );
  });

  test(
    '@PAYM-T1994 Update Installment cost greater than 100',
    {
      tag: [
        '@preprod',
        '@installments_mci_msi',
        '@api',
        '@installments',
        '@team_payments_capabilities',
      ],
    },
    async () => {
      await test.step('It is validated that postman is not responding error', async () => {
        await apiCallNewman.updateCampaign(
          JSON.stringify(cost_greater_onehundred),
          respStatusCode,
          respCode,
          respStatusMsg,
          merchantId,
          merchantToken
        );
      });
    }
  );
});
