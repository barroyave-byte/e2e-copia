import { InstallmentsCampaign } from '@pages/admin/installments_configuration/installmentsCampaign';
import { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';
import { FranchiseConfig } from '@pages/admin/installments_configuration/installmentsCampaign';

export const defaultCampaignsMCI: InstallmentsCampaign = {
  name: 'Test campaign',
  description: 'Test campaign description',
  installments_type: 'MCI',
  campaign_date: null,
  processor: null,
  months: [3, 6],
  months_config: {
    config_months: [
      {
        months: 3,
        enabled: true,
        config_franchise: [
          {
            franchise: 'visa',
            enabled: true,
            installment_rate: '1.2',
            min_amount: '500',
            max_amount: '100000',
          },
        ],
      },
      {
        months: 6,
        enabled: true,
        config_franchise: [
          {
            franchise: 'visa',
            enabled: true,
            installment_rate: '1.2',
            min_amount: '500',
            max_amount: '100000',
          },
        ],
      },
    ],
  },
};

export const pagbankCampaignsMCI: InstallmentsCampaign = {
  name: 'Test campaign',
  description: 'Test campaign description',
  installments_type: 'MCI',
  campaign_date: null,
  processor: null,
  months: [3, 6],
  months_config: {
    config_months: [
      {
        months: 3,
        enabled: true,
        config_franchise: [
          {
            franchise: 'visa',
            enabled: true,
            installment_rate: '1,2',
            min_amount: '500',
            max_amount: '300000',
          },
        ],
      },
      {
        months: 6,
        enabled: true,
        config_franchise: [
          {
            franchise: 'visa',
            enabled: true,
            installment_rate: '1,2',
            min_amount: '200',
            max_amount: '300000',
          },
        ],
      },
    ],
  },
};

export const paypalACDCCampaignsMCI: InstallmentsCampaign = {
  name: 'Campaign with IC2B',
  description: 'Test campaign with IC2B',
  installments_type: 'MCI',
  processor: null,
  campaign_date: null,
  months: [3, 6, 9, 12, 18],
  months_config: {
    config_months: [
      {
        months: 3,
        enabled: true,
        config_franchise: [
          {
            franchise: 'visa',
            enabled: true,
            installment_rate: '',
            min_amount: '0',
            max_amount: '0',
          },
          {
            franchise: 'mastercard',
            enabled: true,
            installment_rate: '',
            min_amount: '0',
            max_amount: '0',
          },
        ],
      },
      {
        months: 6,
        enabled: true,
        config_franchise: [
          {
            franchise: 'visa',
            enabled: true,
            installment_rate: '',
            min_amount: '0',
            max_amount: '0',
          },
          {
            franchise: 'mastercard',
            enabled: true,
            installment_rate: '',
            min_amount: '0',
            max_amount: '0',
          },
        ],
      },
      {
        months: 9,
        enabled: true,
        config_franchise: [
          {
            franchise: 'visa',
            enabled: true,
            installment_rate: '',
            min_amount: '0',
            max_amount: '0',
          },
          {
            franchise: 'mastercard',
            enabled: true,
            installment_rate: '',
            min_amount: '0',
            max_amount: '0',
          },
        ],
      },
      {
        months: 12,
        enabled: true,
        config_franchise: [
          {
            franchise: 'visa',
            enabled: true,
            installment_rate: '',
            min_amount: '0',
            max_amount: '0',
          },
          {
            franchise: 'mastercard',
            enabled: true,
            installment_rate: '',
            min_amount: '0',
            max_amount: '0',
          },
        ],
      },
      {
        months: 18,
        enabled: true,
        config_franchise: [
          {
            franchise: 'visa',
            enabled: true,
            installment_rate: '',
            min_amount: '0',
            max_amount: '0',
          },
          {
            franchise: 'mastercard',
            enabled: true,
            installment_rate: '',
            min_amount: '0',
            max_amount: '0',
          },
        ],
      },
    ],
  },
};

export const volarisCampaignsMCI: InstallmentsCampaign = {
  name: 'Campaign with Installments in Volaris',
  description: 'Test campaign with Installments in Volaris',
  installments_type: 'MCI',
  processor: null,
  campaign_date: null,
  months: [3, 6, 9, 12, 18],
  months_config: {
    config_months: [
      {
        months: 3,
        enabled: true,
        config_franchise: [
          {
            franchise: 'visa',
            enabled: true,
            installment_rate: '1.2',
            min_amount: '0',
            max_amount: '0',
          },
          {
            franchise: 'mastercard',
            enabled: true,
            installment_rate: '1.2',
            min_amount: '0',
            max_amount: '0',
          },
        ],
      },
      {
        months: 6,
        enabled: true,
        config_franchise: [
          {
            franchise: 'visa',
            enabled: true,
            installment_rate: '1.2',
            min_amount: '0',
            max_amount: '0',
          },
          {
            franchise: 'mastercard',
            enabled: true,
            installment_rate: '1.2',
            min_amount: '0',
            max_amount: '0',
          },
        ],
      },
      {
        months: 9,
        enabled: true,
        config_franchise: [
          {
            franchise: 'visa',
            enabled: true,
            installment_rate: '1.2',
            min_amount: '0',
            max_amount: '0',
          },
          {
            franchise: 'mastercard',
            enabled: true,
            installment_rate: '1.2',
            min_amount: '0',
            max_amount: '0',
          },
        ],
      },
      {
        months: 12,
        enabled: true,
        config_franchise: [
          {
            franchise: 'visa',
            enabled: true,
            installment_rate: '1.2',
            min_amount: '0',
            max_amount: '0',
          },
          {
            franchise: 'mastercard',
            enabled: true,
            installment_rate: '1.2',
            min_amount: '0',
            max_amount: '0',
          },
        ],
      },
      {
        months: 18,
        enabled: true,
        config_franchise: [
          {
            franchise: 'visa',
            enabled: true,
            installment_rate: '1.2',
            min_amount: '0',
            max_amount: '0',
          },
          {
            franchise: 'mastercard',
            enabled: true,
            installment_rate: '1.2',
            min_amount: '0',
            max_amount: '0',
          },
        ],
      },
    ],
  },
};

const createConfig = (months: number, minAmount: string, maxAmount: string): any => {
  const franchises: FranchiseConfig[] = ['visa', 'mastercard', 'amex', 'diners'].map(
    (franchise) => ({
      franchise,
      enabled: true,
      installment_rate: '0',
      min_amount: minAmount,
      max_amount: maxAmount,
    })
  );

  return {
    months,
    enabled: true,
    config_franchise: franchises,
  };
};

export const createDefaultCampaignMSI = (numberInstallment: string): InstallmentsCampaign => {
  // Active franchise rows require an explicit maxAmount; reuse the existing test ceiling so the campaign remains valid and savable.
  const configMap: { [key: string]: { minAmount: string; maxAmount: string } } = {
    '3': { minAmount: '500', maxAmount: '100000' },
    '6': { minAmount: '250', maxAmount: '100000' },
    '9': { minAmount: '277', maxAmount: '100000' },
    '12': { minAmount: '208', maxAmount: '100000' },
    '18': { minAmount: '138', maxAmount: '100000' },
  };

  const config = createConfig(
    Number(numberInstallment),
    configMap[numberInstallment].minAmount,
    configMap[numberInstallment].maxAmount
  );

  return {
    name: 'Test campaign MSI',
    description: 'Test campaign description',
    installments_type: 'MSI',
    campaign_date: null,
    processor: null,
    months: [Number(numberInstallment)],
    months_config: {
      config_months: [config],
    },
  };
};

export const defaultCampaignsMSIAllMonths: InstallmentsCampaign = {
  name: 'Test campaign MSI',
  description: 'Test campaign description',
  installments_type: 'MSI',
  campaign_date: null,
  processor: null,
  months: [3, 6, 9, 12, 18],
  months_config: {
    config_months: [
      createConfig(3, '500', '100000'),
      createConfig(6, '250', '100000'),
      createConfig(9, '277', ''),
      createConfig(12, '208', ''),
      createConfig(18, '138', ''),
    ],
  },
};
