import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as updateResponse from '@support/interfaces/installments';

const configMerchant = new ConfigMerchant();
const rate_greater_onehundred = {
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
          cost: 50,
          installment_rate: 101,
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

const respStatusCode = updateResponse.updateRateGreaterOneHundred.statusCode;
const respCode = updateResponse.updateRateGreaterOneHundred.code;
const respStatusMsg = updateResponse.updateRateGreaterOneHundred.error;

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
    '@PAYM-T1996 Update Installment installment rate greater than 100',
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
          JSON.stringify(rate_greater_onehundred),
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
