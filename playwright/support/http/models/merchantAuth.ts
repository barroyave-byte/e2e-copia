import { CountryCodes } from "@support/interfaces/countryCodeTypes";

/**
 * Mer chant models
 */
export interface MerchantRequest {
    country: CountryCodes;
    city: string;
    name: string;
    short_name: string;
    timezone: string;
    currency: string;
    managed_by_deuna: boolean;
}
export interface MerchantResponse {
    id: string;
    country: CountryCodes;
    city: string;
    name: string;
    short_name: string;
    timezone: string;
    managed_by_duna: boolean;
    currency: string;
    term_and_conditions_url: string;
    created_at: string;
    updated_at: string;
    privacy_policies_url: string;
    tenant_id: string;
    external_merchant_activity_code: string;
    
}

/**
 * Merchant login models
 */

export interface MerchantLoginRequest {
    email: string;
    password: string;
}


export interface MerchantLoginResponse {
    code: number;
    expire: string;
    token: string;

}


/**
 * Store models
 */
export interface StoreRequest{
    merchantToken: string;
    merchantId: string;
    storeData: StoreData;
}


export interface StoreData {
    name: string;
    latitude: number;
    longitude: number;
    address: string;
}
export interface StoreResponse {
    
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    created_at: string;
    updated_at: string;
    is_default: boolean;
}

/**
 * Merchant Application models
 */

export interface MerchantApplicationRequest {
    merchantToken: string;
    merchantId: string;
    merchantApplicationData: MerchantApplicationData;
}
export interface MerchantApplicationData {
    expire_at: string;
    is_sandbox: boolean;
    name: string;
}
export interface MerchantApplicationResponse {
    id: string;
    name: string;
    public_key: string;
    private_key: string;
    signing_secret: string;
    is_sandbox: boolean;
    status: string;
    channel: string;
    created_at: string;
    updated_at: string;
}

/**
 * External endpoint models
 */
export interface ExternalEndpointData {
    url: string;
    http_method: string;
    config_type: string;
    headers?: Array<{ key: string; value: string }>;
}

export interface ExternalEndpointResponse {
    id: string;
    merchant_id: string;
    url: string;
    http_method: string;
    config_type: string;
    created_at: string;
    updated_at: string;
}