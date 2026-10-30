import { InstallmentsCampaignData } from '@support/http/models/paymentMsi';

/**
 * Builder for the 4 campaigns used in Get Campaigns tests
 * These campaigns match the setup from the Postman collection
 */

/**
 * Campaign 1: Active campaign with both start_date and end_date
 * Used for validating date range queries
 */
export function buildCampaign1(currentDate: string, oneDayLater: string): InstallmentsCampaignData {
  return {
    name: 'campaña día de la madre',
    description: 'campaña de test para kushki',
    status: 'active',
    start_date: currentDate,
    end_date: oneDayLater,
    processors: [
      {
        id: 40,
        name: 'kushki',
      },
    ],
    options: [
      {
        installments: 3,
        installments_type: 'MSI',
        currency: 'MXN',
        card_branch: [
          {
            amount_min: 1200,
            name: 'visa',
            cost: 0,
            installment_rate: 0,
            installments_interest_formula: '',
          },
          {
            amount_min: 1200,
            name: 'mastercard',
            cost: 0,
            installment_rate: 0,
            installments_interest_formula: '',
          },
        ],
      },
      {
        installments: 6,
        installments_type: 'MSI',
        currency: 'MXN',
        card_branch: [
          {
            amount_min: 600,
            name: 'visa',
            cost: 0,
            installment_rate: 0,
            installments_interest_formula: '',
          },
        ],
      },
    ],
  };
}

/**
 * Campaign 2: Active campaign with only start_date (no end_date)
 * Used for validating open-ended campaigns
 */
export function buildCampaign2(currentDate: string): InstallmentsCampaignData {
  return {
    name: 'campaña día de la madre',
    description: 'campaña de test para kushki',
    status: 'active',
    start_date: currentDate,
    processors: [
      {
        id: 40,
        name: 'kushki',
      },
    ],
    options: [
      {
        installments: 3,
        installments_type: 'MSI',
        currency: 'MXN',
        card_branch: [
          {
            amount_min: 1200,
            name: 'visa',
            cost: 0,
            installment_rate: 0,
            installments_interest_formula: '',
          },
          {
            amount_min: 1200,
            name: 'mastercard',
            cost: 0,
            installment_rate: 0,
            installments_interest_formula: '',
          },
        ],
      },
      {
        installments: 6,
        installments_type: 'MSI',
        currency: 'MXN',
        card_branch: [
          {
            amount_min: 600,
            name: 'visa',
            cost: 0,
            installment_rate: 0,
            installments_interest_formula: '',
          },
        ],
      },
    ],
  };
}

/**
 * Campaign 3: Inactive campaign with only end_date (no start_date)
 * Used for validating inactive campaigns and end date queries
 */
export function buildCampaign3(oneDayLater: string): InstallmentsCampaignData {
  return {
    name: 'campaña día de la madre',
    description: 'campaña de test para kushki',
    status: 'inactive',
    end_date: oneDayLater,
    processors: [
      {
        id: 40,
        name: 'kushki',
      },
    ],
    options: [
      {
        installments: 3,
        installments_type: 'MSI',
        currency: 'MXN',
        card_branch: [
          {
            amount_min: 1200,
            amount_max: 1400,
            name: 'visa',
            cost: 0,
            installment_rate: 0,
            installments_interest_formula: '',
          },
          {
            amount_min: 600,
            amount_max: 1200,
            name: 'mastercard',
            cost: 0,
            installment_rate: 0,
            installments_interest_formula: '',
          },
        ],
      },
      {
        installments: 6,
        installments_type: 'MSI',
        currency: 'MXN',
        card_branch: [
          {
            amount_min: 600,
            amount_max: 1200,
            name: 'visa',
            cost: 0,
            installment_rate: 0,
            installments_interest_formula: '',
          },
        ],
      },
    ],
  };
}

/**
 * Campaign 4: Active campaign without start_date or end_date
 * Used for validating campaigns without date restrictions
 */
export function buildCampaign4(): InstallmentsCampaignData {
  return {
    name: 'campaña día de la madre',
    description: 'campaña de test para kushki',
    status: 'active',
    processors: [
      {
        id: 40,
        name: 'kushki',
      },
    ],
    options: [
      {
        installments: 3,
        installments_type: 'MSI',
        currency: 'MXN',
        card_branch: [
          {
            amount_min: 1200,
            amount_max: 1400,
            name: 'visa',
            cost: 0,
            installment_rate: 0,
            installments_interest_formula: '',
          },
          {
            amount_min: 600,
            amount_max: 1200,
            name: 'mastercard',
            cost: 0,
            installment_rate: 0,
            installments_interest_formula: '',
          },
        ],
      },
      {
        installments: 6,
        installments_type: 'MSI',
        currency: 'MXN',
        card_branch: [
          {
            amount_min: 600,
            amount_max: 1200,
            name: 'visa',
            cost: 0,
            installment_rate: 0,
            installments_interest_formula: '',
          },
        ],
      },
    ],
  };
}

/**
 * Helper function to generate dates similar to Postman collection
 * Returns current_date, one_day_later, one_day_before, two_days_later
 */
export function generateCampaignDates() {
  const currentDate = new Date();
  
  const oneDayLater = new Date(currentDate);
  oneDayLater.setDate(currentDate.getDate() + 1);
  
  const oneDayBefore = new Date(currentDate);
  oneDayBefore.setDate(currentDate.getDate() - 1);
  
  const twoDaysLater = new Date(currentDate);
  twoDaysLater.setDate(currentDate.getDate() + 2);
  
  return {
    current_date: currentDate.toISOString(),
    one_day_later: oneDayLater.toISOString(),
    one_day_before: oneDayBefore.toISOString(),
    two_days_later: twoDaysLater.toISOString(),
  };
}
