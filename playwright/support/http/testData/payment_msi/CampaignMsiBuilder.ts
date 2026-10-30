import { InstallmentsCampaignData } from "@support/http/models/paymentMsi";

/**
 * Options for customizing Campaign MSI
 */
export interface CampaignMsiOptions {
  processor_id?: number;
  processor_name?: string;
  currency_code?: string;
  card_brands?: string[];
  display_label_template?: { language: string; MSI: string; MCI?: string; one_or_no_installment_option?: string };
}

/**
 * Builder class for MSI (Meses Sin Intereses) Campaign configuration
 */
export class CampaignMsiBuilder {
  /**
   * Creates a complete MSI campaign configuration with installment options
   *
   * @param options - Optional customizations (processor_id, processor_name, currency_code, card_brands)
   * @returns Complete InstallmentsCampaignData with MSI options for 3, 6, 9, 12, and 18 months
   */
  static createCampaignMsi(options: CampaignMsiOptions = {}): InstallmentsCampaignData {
    const {
      processor_id = 1,
      processor_name = 'mercadopago',
      currency_code = 'MXN',
      card_brands = ['visa', 'mastercard', 'amex', 'diners'],
      display_label_template,
    } = options;

    const buildCardBranch = (amount_min: number) =>
      card_brands.map((name) => ({ amount_min, name, cost: 0, installment_rate: 0, installments_interest_formula: '' }));

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
      display_label_template: display_label_template ?? {
        language: 'es',
        MSI: '{installments} de ${amount} sin interés',
        MCI: '{installments} meses de ${amount}',
      },
      options: [
        { installments: 3,  installments_type: 'MSI', currency: currency_code, card_branch: buildCardBranch(500) },
        { installments: 6,  installments_type: 'MSI', currency: currency_code, card_branch: buildCardBranch(250) },
        { installments: 9,  installments_type: 'MSI', currency: currency_code, card_branch: buildCardBranch(277.777) },
        { installments: 12, installments_type: 'MSI', currency: currency_code, card_branch: buildCardBranch(208.333) },
        { installments: 18, installments_type: 'MSI', currency: currency_code, card_branch: buildCardBranch(138.888) },
      ],
    };
  }
}
