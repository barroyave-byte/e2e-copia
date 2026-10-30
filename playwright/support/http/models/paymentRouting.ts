export interface MerchantRoutingData {
    id: string;
    description: string;
    is_active: boolean;
}

export interface MerchantRoutingResponse {
    
}

export interface ProcessorRoutingData {
    processor_id: number;
    code: string;
    is_active: boolean;
}

export interface ProcessorRoutingResponse {
    
}

export interface StoreRoutingData {
    store_code: string;
    algorithm_type: string;
    country: string;
    is_active: boolean;
    settings: {
        processor_code: string;
    }[];
}

export interface StoreRoutingResponse {
    id: string;
    
    
}

export interface StoreRoutingActiveData {
    id: string;
}

export interface StoreRoutingActiveResponse {

}

export interface MerchantRuleResponse {
    id: string;
}

export interface MerchantRuleGetResponse {
    id: string;
    members: Record<string, unknown>[];
    [key: string]: unknown;
}
