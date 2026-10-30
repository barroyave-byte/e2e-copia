export interface InstallmentsCampaignRequest {
    merchantToken: string;
    merchantId: string;
    installmentsCampaignData: InstallmentsCampaignData;
}

export interface InstallmentsCampaignData {
    name: string;
    description: string;
    status: string;
    start_date?: string;
    end_date?: string;
    display_label_template?: {
        language: string;
        MSI: string;
        MCI?: string;
    };
    processors: {
        id: number;
        name: string;
        external_payment_plan_id?: string;
        mci_to_psp_as?: string;
    }[];
    options: {
        installments: number;
        installments_type: string;
        currency: string;
        card_branch: {
            amount_min: number;
            amount_max?: number;
            name: string;
            cost: number;
            installment_rate: number;
            installments_interest_formula: string;
        }[];
    }[];
    
}


export interface InstallmentsCampaignResponse {
    data: {
        id: string;
    };
}

export interface UpdateInstallmentsCampaignResponse {
    data: {
        code: number;
        info: string;
        data: {
            id: string;
            merchant_id: string;
            store_codes: string[];
            name: string;
            description: string;
            status: string;
            start_date: string;
            end_date: string;
            processors: {
                id: number;
                merchant_payment_processor_id: string;
                name: string;
                external_payment_plan_id: string;
            }[];
            options: {
                installments: number;
                installments_type: string;
                currency: string;
                card_branch: {
                    name: string;
                    cost: number;
                    installment_rate: number;
                    installments_interest_formula: string;
                    amount_min: number;
                    amount_max?: number;
                }[];
            }[];
        };
    };
}

export interface GetInstallmentsParams {
  merchantId: string;
  storeCode: string;
  merchantToken: string;
  amount: number;
  currency: string;
  bin: string;
  transactionId: string;
  country: string;
}

export interface InstallmentPlan {
  installments: number;
  installments_amount: number;
}

export interface GetInstallmentsResponse {
  installments: InstallmentPlan[];
}

export interface GetCampaignsQueryParams {
    start_date?: string;
    end_date?: string;
    date?: string;
    status?: 'active' | 'inactive';
}

export interface GetCampaignsResponse {
    code: number;
    data?: CampaignData[];
    error?: string;
}

export interface CampaignData {
    id: string;
    merchant_id: string;
    store_codes: string[];
    name: string;
    description: string;
    status: string;
    start_date?: string;
    end_date?: string;
    processors: {
        id: number;
        merchant_payment_processor_id: string;
        name: string;
        external_payment_plan_id: string;
    }[];
    options: {
        installments: number;
        installments_type: string;
        currency: string;
        card_branch: {
            name: string;
            cost: number;
            installment_rate: number;
            installments_interest_formula: string;
            amount_min: number;
            amount_max?: number;
        }[];
    }[];
}
