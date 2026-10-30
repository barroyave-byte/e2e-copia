import { test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as updateResponse from '@support/interfaces/installments';

const configMerchant = new ConfigMerchant();
const amount_min_lower_zero = {
  options: [
    {
      installments: 3,
      installments_type: 'MSI',
      currency: 'MXN',
      card_branch: [
        {
          amount_min: -1,
          amount_max: 3000,
          name: 'visa',
          cost: 0,
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

const respStatusCode = updateResponse.updateAmountMinLowerZero.statusCode;
const respCode = updateResponse.updateAmountMinLowerZero.code;
const respStatusMsg = updateResponse.updateAmountMinLowerZero.error;

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
    '@PAYM-T1988 Update Installment campaign amount_min lower than 0',
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
          JSON.stringify(amount_min_lower_zero),
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
