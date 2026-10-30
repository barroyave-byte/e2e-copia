import { InstallmentsCampaignData } from "@support/http/models/paymentMsi";

/**
 * Options for customizing Campaign MCI
 */
export interface CampaignMciOptions {
  processor_id?: number;
  processor_name?: string;
  currency_code?: string;
}

/**
 * Builder class for MCI (Meses Con Intereses) Campaign configuration
 */
export class CampaignMciBuilder {
  /**
   * Creates a complete MCI campaign configuration with installment options
   *
   * @param options - Optional customizations (processor_id, processor_name, currency_code)
   * @returns Complete InstallmentsCampaignData with MCI options for 3, 6, 9, 12, and 18 months
   */
  static createCampaignMci(options: CampaignMciOptions = {}): InstallmentsCampaignData {
    const {
      processor_id = 1,
      processor_name = 'mercadopago',
      currency_code = 'MXN',
    } = options;

    return {
      name: 'campaña test',
      description: 'campaña de test para mercadopago credit',
      status: 'active',
      processors: [
        {
          id: processor_id,
          name: processor_name,
        },
      ],
      display_label_template: {
        language: 'es',
        MSI: '{installments} meses sin intereses de ${amount}',
        MCI: '{installments} de ${amount} con interés del {rate}%'
      },
      options: [
        {
          installments: 3,
          installments_type: 'MCI',
          currency: currency_code,
          card_branch: [
            {
              amount_min: 500,
              name: 'visa',
              cost: 0,
              installment_rate: 1.2,
              installments_interest_formula: '',
            },
            {
              amount_min: 500,
              name: 'mastercard',
              cost: 0,
              installment_rate: 1.2,
              installments_interest_formula: '',
            },
            {
              amount_min: 500,
              name: 'diners',
              cost: 0,
              installment_rate: 1.2,
              installments_interest_formula: '',
            },
          ],
        },
        {
          installments: 6,
          installments_type: 'MCI',
          currency: currency_code,
          card_branch: [
            {
              amount_min: 250,
              name: 'visa',
              cost: 0,
              installment_rate: 1.2,
              installments_interest_formula: '',
            },
            {
              amount_min: 250,
              name: 'mastercard',
              cost: 0,
              installment_rate: 1.2,
              installments_interest_formula: '',
            },
            {
              amount_min: 250,
              name: 'diners',
              cost: 0,
              installment_rate: 1.2,
              installments_interest_formula: '',
            },
          ],
        },
      ],
    };
  }
}
