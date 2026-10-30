import { expect, test } from '@support/fixtures';
import ConfigMerchant from '@support/api_sup/config_merchant_sup/configMerchant';
import * as apiCallNewman from '@support/newman/apiCallNewman';
import * as processorsConfig from '@support/interfaces/payment_processors';
import * as createError from '@support/interfaces/installments';

const configMerchant = new ConfigMerchant();
const respStatusCode = createError.createErrorAmountMinLowerZero.statusCode;
const respCode = createError.createErrorAmountMinLowerZero.code;
const respStatusMsg = createError.createErrorAmountMinLowerZero.error;
const object_to_edit = {
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
    '@PAYM-T1949 Create Installment campaign amount_min lower than 0',
    {
      tag: [
        '@preprod',
        '@installments_mci_msi',
        '@api',
        '@installments',
        '@team_payments_capabilities',
      ],
    },
    async ({}) => {
      await test.step('It is validated that postman is not responding error', async () => {
        const response = await apiCallNewman.createEditableCampaign(
          merchantId,
          merchantToken,
          JSON.stringify(object_to_edit),
          respStatusCode,
          respCode,
          respStatusMsg
        );
        expect(response.status).toBe(respStatusCode);
        expect(response.data.code).toBe(respCode);
        expect(response.data.error).toBe(respStatusMsg);
      });
    }
  );
});
