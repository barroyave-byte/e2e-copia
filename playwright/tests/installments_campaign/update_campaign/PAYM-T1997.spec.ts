import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as updateResponse from '@support/interfaces/installments';

const configMerchant = new ConfigMerchant();
const no_name = {
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
          name: '',
          cost: 50,
          installment_rate: 50,
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

const respStatusCode = updateResponse.updateNoName.statusCode;
const respCode = updateResponse.updateNoName.code;
const respStatusMsg = updateResponse.updateNoName.error;

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
    '@PAYM-T1997 Update Installment missing name',
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
          JSON.stringify(no_name),
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
