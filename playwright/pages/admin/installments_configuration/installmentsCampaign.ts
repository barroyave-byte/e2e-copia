import type { Locator } from '@playwright/test';
import type { ConnectionsAvailable } from '@support/interfaces/connectionsAvailable';

export type FranchiseConfig = {
  franchise: string;
  enabled: boolean;
  installment_rate: string;
  min_amount: string;
  max_amount: string;
};

/**
 * @example
 * const installmentsCampaign: InstallmentsCampaign = {
 *   name: 'Test campaign',
 *   description: 'Test campaign description',
 *   installments_type: 'MCI',
 *   campaign_date: null,
 *   processor: [ConnectionsAvailable.dlocal],
 *   months: [3, 6, 9],
 *   months_config: configInstallmentsMonth,
 * };
 */
export interface InstallmentsCampaign {
  name: string;
  description: string;
  installments_type: 'MSI' | 'MCI';
  campaign_date: { start: string; end: string } | null;
  processor: ConnectionsAvailable[] | null;
  months: number[];
  months_config?: ConfigInstallmentsMonths;
  actions?: (checkbox: Locator) => { [key: number]: () => Promise<void> };
}

/**
 * Interface for the configuration of the installments by month and franchise
 * e.g.: 3 months, 6 months, 9 months with the franchise visa enabled and the rate of 4.5% for the amount between 1 and 1000
 */
export interface ConfigInstallmentsMonths {
  config_months: ConfigMonth[];
}
export interface ConfigMonth {
  months: number;
  enabled: boolean;
  config_franchise: ConfigFranchise[];
}
export interface ConfigFranchise {
  franchise: string;
  enabled: boolean;
  installment_rate: string;
  min_amount: string;
  max_amount: string;
}
