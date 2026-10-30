import { InstallmentsCampaignData } from "@support/http/models/paymentMsi";

export const DEFAULT_CAMPAIGN_MSI: InstallmentsCampaignData = {
    name: 'campaña día de la madre',
    description: 'campaña de test para kushki',
    status: 'active',
    start_date: '2023-08-13T14:30:00Z',
    end_date: '2023-09-13T14:30:00Z',
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
                    amount_min: 600,
                    name: 'visa',
                    cost: 0,
                    installment_rate: 0,
                    installments_interest_formula: '',
                },
                {
                    amount_min: 600,
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
